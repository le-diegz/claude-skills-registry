import { describe, expect, it } from "vitest";
import { addBusinessDays, easterSunday, isBusinessDay, frenchPublicHolidays } from "@/lib/domain/business-days";
import {
  DEFAULT_POLICY,
  computeFollowupDate,
  effectiveMaxFollowups,
  followupEligibility,
  isWithinSendWindow,
  nextSendWindowStart,
  planNextFollowup,
  templateKindForSequence,
  type FollowupPolicy,
} from "@/lib/domain/followup-engine";
import { canTransition, displayStatus } from "@/lib/domain/quote-status";
import { renderTemplate, unknownVariables, buildTemplateValues, emptyVariablesUsed } from "@/lib/domain/templates";

describe("jours fériés et jours ouvrés", () => {
  it("calcule Pâques", () => {
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ year: 2027, month: 3, day: 28 });
  });
  it("liste les fériés 2026", () => {
    const h = frenchPublicHolidays(2026);
    expect(h.has("2026-04-06")).toBe(true); // lundi de Pâques
    expect(h.has("2026-05-14")).toBe(true); // Ascension
    expect(h.has("2026-05-25")).toBe(true); // Pentecôte
    expect(h.has("2026-11-11")).toBe(true);
    expect(h.size).toBe(11);
  });
  it("week-end et fériés ne sont pas ouvrés", () => {
    expect(isBusinessDay({ year: 2026, month: 11, day: 14 })).toBe(false); // samedi
    expect(isBusinessDay({ year: 2026, month: 11, day: 11 })).toBe(false); // mercredi férié
    expect(isBusinessDay({ year: 2026, month: 11, day: 12 })).toBe(true);
  });
  it("ajoute des jours ouvrés en sautant week-ends et fériés", () => {
    // vendredi 6 nov 2026 + 3 jours ouvrés : lun 9, mar 10, (mer 11 férié), jeu 12
    expect(addBusinessDays({ year: 2026, month: 11, day: 6 }, 3)).toEqual({ year: 2026, month: 11, day: 12 });
    // samedi + 0 → lundi
    expect(addBusinessDays({ year: 2026, month: 11, day: 14 }, 0)).toEqual({ year: 2026, month: 11, day: 16 });
    // 24 déc + 1 → 28 déc (25 férié, 26-27 week-end)
    expect(addBusinessDays({ year: 2026, month: 12, day: 24 }, 1)).toEqual({ year: 2026, month: 12, day: 28 });
  });
});

describe("calcul des échéances", () => {
  const policy: FollowupPolicy = { ...DEFAULT_POLICY };

  it("1re relance : J+3 ouvrés à 9h Paris", () => {
    const sent = new Date("2026-11-06T15:00:00Z"); // vendredi
    expect(computeFollowupDate(policy, sent, 1)!.toISOString()).toBe("2026-11-12T08:00:00.000Z");
  });
  it("2e relance : J+7 ouvrés depuis la précédente", () => {
    const prev = new Date("2026-11-12T08:05:00Z");
    // jeu 12 + 7 ouvrés : 13,16,17,18,19,20,23 → lun 23 nov
    expect(computeFollowupDate(policy, prev, 2)!.toISOString()).toBe("2026-11-23T08:00:00.000Z");
  });
  it("jours calendaires si l'option est désactivée", () => {
    const p = { ...policy, business_days_only: false };
    expect(computeFollowupDate(p, new Date("2026-11-06T15:00:00Z"), 1)!.toISOString()).toBe("2026-11-09T08:00:00.000Z");
  });
  it("heure d'été : 9h Paris = 7h UTC", () => {
    expect(computeFollowupDate(policy, new Date("2026-06-01T10:00:00Z"), 1)!.toISOString()).toBe("2026-06-04T07:00:00.000Z");
  });
  it("pas de 3e relance si le délai n'est pas défini ou si max = 2", () => {
    expect(effectiveMaxFollowups({ ...policy, third_delay_days: null })).toBe(2);
    expect(computeFollowupDate({ ...policy, max_followups: 2 }, new Date(), 3)).toBeNull();
    expect(computeFollowupDate(policy, new Date(), 4)).toBeNull();
  });
  it("fenêtre d'envoi", () => {
    expect(isWithinSendWindow(policy, new Date("2026-11-12T09:00:00Z"))).toBe(true); // 10h Paris jeudi
    expect(isWithinSendWindow(policy, new Date("2026-11-12T18:30:00Z"))).toBe(false); // 19h30
    expect(isWithinSendWindow(policy, new Date("2026-11-14T10:00:00Z"))).toBe(false); // samedi
    expect(nextSendWindowStart(policy, new Date("2026-11-13T19:00:00Z")).toISOString()).toBe("2026-11-16T08:00:00.000Z");
    expect(nextSendWindowStart(policy, new Date("2026-11-12T06:00:00Z")).toISOString()).toBe("2026-11-12T08:00:00.000Z");
  });
  it("choix du modèle", () => {
    expect(templateKindForSequence(1, 3)).toBe("first");
    expect(templateKindForSequence(2, 3)).toBe("second");
    expect(templateKindForSequence(3, 3)).toBe("last");
    expect(templateKindForSequence(2, 2)).toBe("last");
    expect(templateKindForSequence(1, 1)).toBe("first");
  });
});

describe("éligibilité et arrêt des relances", () => {
  const base = {
    status: "sent" as const,
    followups_paused: false,
    followup_count: 0,
    customer_do_not_contact: false,
    sent_at: "2026-11-06T15:00:00Z",
    last_followup_at: null,
  };
  it("planifie la première relance d'un devis envoyé", () => {
    expect(planNextFollowup(base, DEFAULT_POLICY)).toEqual({ sequence: 1, scheduledFor: new Date("2026-11-12T08:00:00Z") });
  });
  it.each([
    ["accepted", "closed"],
    ["declined", "closed"],
    ["cancelled", "closed"],
    ["expired", "closed"],
    ["pending", "awaiting_decision"],
    ["draft", "not_sent"],
  ] as const)("arrêt si statut %s", (status, reason) => {
    expect(followupEligibility({ ...base, status }, DEFAULT_POLICY)).toEqual({ eligible: false, reason });
    expect(planNextFollowup({ ...base, status }, DEFAULT_POLICY)).toBeNull();
  });
  it("arrêt si opposition, suspension ou maximum atteint", () => {
    expect(followupEligibility({ ...base, customer_do_not_contact: true }, DEFAULT_POLICY)).toMatchObject({ reason: "do_not_contact" });
    expect(followupEligibility({ ...base, followups_paused: true }, DEFAULT_POLICY)).toMatchObject({ reason: "paused" });
    expect(followupEligibility({ ...base, status: "followed_up", followup_count: 3 }, DEFAULT_POLICY)).toMatchObject({ reason: "max_reached" });
  });
  it("2e relance comptée depuis la précédente", () => {
    const plan = planNextFollowup({ ...base, status: "followed_up", followup_count: 1, last_followup_at: "2026-11-12T08:05:00Z" }, DEFAULT_POLICY);
    expect(plan).toEqual({ sequence: 2, scheduledFor: new Date("2026-11-23T08:00:00Z") });
  });
});

describe("machine à états des devis", () => {
  it("autorise et refuse les bonnes transitions", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("draft", "accepted")).toBe(false);
    expect(canTransition("sent", "accepted")).toBe(true);
    expect(canTransition("accepted", "declined")).toBe(false);
    expect(canTransition("cancelled", "accepted")).toBe(false);
  });
  it("affiche « À relancer » quand l'échéance est passée", () => {
    const now = new Date("2026-11-13T10:00:00Z");
    expect(displayStatus("sent", "2026-11-12T08:00:00Z", now)).toBe("to_follow_up");
    expect(displayStatus("sent", "2026-11-20T08:00:00Z", now)).toBe("sent");
    expect(displayStatus("accepted", "2026-11-12T08:00:00Z", now)).toBe("accepted");
  });
});

describe("templates", () => {
  const values = buildTemplateValues({
    customer: { name: "Mme Martin" },
    organization: { name: "Clim Express" },
    quote: { reference: "D-1", title: "Clim séjour", amount_ttc_cents: 379500, sent_at: "2026-11-03T10:00:00Z", issued_on: "2026-11-02", expires_on: null },
  });
  it("remplace les variables", () => {
    const out = renderTemplate("Bonjour {client_name}, devis {quote_reference} de {quote_amount} du {quote_date}. {company_name}", values);
    expect(out.replace(/\s/g, " ")).toBe("Bonjour Mme Martin, devis D-1 de 3 795,00 € TTC du 3 novembre 2026. Clim Express");
  });
  it("détecte les variables inconnues ou vides", () => {
    expect(unknownVariables("Bonjour {client_nom} {quote_reference}")).toEqual(["client_nom"]);
    expect(emptyVariablesUsed("Valable jusqu'au {expiration_date}", values)).toEqual(["expiration_date"]);
  });
});
