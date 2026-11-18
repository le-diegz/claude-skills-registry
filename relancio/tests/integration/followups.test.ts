import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, createCustomer, createOrg, daysAgo, deleteOrg, type Db } from "./helpers";

// Fournisseur email simulé : on contrôle le nombre d'appels et les échecs
const sendEmail = vi.fn();
vi.mock("@/lib/services/email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args), verifyResendWebhook: vi.fn() }));

const { syncQuoteFollowups, prepareDueFollowups, approveJob, markJobSentManually, sendApprovedJob, skipJob, snoozeJob, expireOverdueQuotes } = await import("@/lib/services/followups");
const { changeQuoteStatus, recordReply, setFollowupsPaused } = await import("@/lib/services/quotes");

let org: Awaited<ReturnType<typeof createOrg>>;
let db: Db;
const ctx = () => ({ organizationId: org.orgId, userId: org.owner.id });

async function makeQuote(over: Record<string, unknown> = {}, customerOver: Record<string, unknown> = {}) {
  const c = await createCustomer(db, org.orgId, customerOver);
  const { data, error } = await db
    .from("quotes")
    .insert({
      organization_id: org.orgId,
      customer_id: c.id,
      reference: `R-${Math.random().toString(36).slice(2, 9)}`,
      title: "Climatisation séjour",
      amount_ht_cents: 345000,
      amount_ttc_cents: 379500,
      vat_rate_bp: 1000,
      status: "sent",
      sent_at: daysAgo(10),
      ...over,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data!;
}

async function jobsOf(quoteId: string) {
  const { data } = await admin.from("followup_jobs").select("*").eq("quote_id", quoteId).order("sequence");
  return data ?? [];
}

async function dueJob(quoteId: string) {
  await syncQuoteFollowups(db, quoteId);
  await prepareDueFollowups(db, { organizationId: org.orgId });
  return (await jobsOf(quoteId)).find((j) => j.status === "pending_approval")!;
}

beforeAll(async () => {
  process.env.RESEND_API_KEY = "re_test_simule";
  process.env.RESEND_FROM_EMAIL = "relances@exemple.test";
  org = await createOrg("Clim Test");
  db = org.owner.client;
  // Fenêtre d'envoi 24h/24, 7j/7 pour des tests déterministes
  await admin.from("followup_policies").update({ business_days_only: false, window_start_minutes: 0, window_end_minutes: 1440 }).eq("organization_id", org.orgId);
});
afterAll(() => deleteOrg(org.orgId));
beforeEach(() => sendEmail.mockReset());

describe("programmation et préparation", () => {
  it("programme la 1re relance à la création et la prépare quand elle est due", async () => {
    const q = await makeQuote();
    const job = await syncQuoteFollowups(db, q.id);
    expect(job?.sequence).toBe(1);
    expect(job?.status).toBe("scheduled");
    await prepareDueFollowups(db, { organizationId: org.orgId });
    const [j] = await jobsOf(q.id);
    expect(j.status).toBe("pending_approval");
    expect(j.subject).toContain(q.reference);
    expect(j.body).toContain("Client Test");
    const { data: quote } = await admin.from("quotes").select("status").eq("id", q.id).single();
    expect(quote!.status).toBe("to_follow_up");
  });

  it("est idempotent : deux préparations ne créent pas de doublon", async () => {
    const q = await makeQuote();
    await Promise.all([syncQuoteFollowups(db, q.id), syncQuoteFollowups(db, q.id)]);
    await Promise.all([prepareDueFollowups(db, { organizationId: org.orgId }), prepareDueFollowups(db, { organizationId: org.orgId })]);
    const jobs = await jobsOf(q.id);
    expect(jobs).toHaveLength(1);
    const { count } = await admin.from("activity_events").select("id", { count: "exact", head: true }).eq("quote_id", q.id).eq("type", "followup_prepared");
    expect(count).toBe(1);
  });

  it("un client sans email donne une relance « À préparer » (téléphone)", async () => {
    const q = await makeQuote({}, { email: null });
    const jobs = (await syncQuoteFollowups(db, q.id), await prepareDueFollowups(db, { organizationId: org.orgId }), await jobsOf(q.id));
    expect(jobs[0].status).toBe("to_prepare");
    expect(jobs[0].channel).toBe("phone");
  });

  it("ne programme rien pour un brouillon", async () => {
    const q = await makeQuote({ status: "draft", sent_at: null });
    expect(await syncQuoteFollowups(db, q.id)).toBeNull();
    expect(await jobsOf(q.id)).toHaveLength(0);
  });
});

describe("validation humaine obligatoire", () => {
  it("refuse l'envoi d'une relance non validée", async () => {
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await expect(sendApprovedJob(db, { ...ctx(), isDemo: false, fromName: "Clim Test", replyTo: null }, job.id)).rejects.toThrow(/validée/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("la base refuse « sending »/« sent » sans validation, même en accès direct", async () => {
    const q = await makeQuote();
    const job = await dueJob(q.id);
    const { error } = await db.from("followup_jobs").update({ status: "sending" }).eq("id", job.id);
    expect(error?.message).toMatch(/approval_required/);
    const { error: e2 } = await db.from("followup_jobs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", job.id);
    expect(e2).not.toBeNull();
  });

  it("modifier un message validé exige une nouvelle validation", async () => {
    const { updateJobContent } = await import("@/lib/services/followups");
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await approveJob(db, ctx(), job.id);
    await updateJobContent(db, ctx(), job.id, { subject: "Nouveau", body: "Texte modifié", recipientEmail: "a@b.test" });
    const [j] = await jobsOf(q.id);
    expect(j.status).toBe("pending_approval");
    expect(j.approved_by).toBeNull();
  });
});

describe("envoi email", () => {
  it("envoie une relance validée, une seule fois même en cas de clics simultanés", async () => {
    sendEmail.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 150));
      return { ok: true, providerMessageId: "msg_123" };
    });
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await approveJob(db, ctx(), job.id);
    const sender = { ...ctx(), isDemo: false, fromName: "Clim Test", replyTo: null };
    const results = await Promise.allSettled([sendApprovedJob(db, sender, job.id), sendApprovedJob(db, sender, job.id), sendApprovedJob(db, sender, job.id)]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(sendEmail.mock.calls[0][0].idempotencyKey).toBe(`followup-${job.id}`);
    const jobs = await jobsOf(q.id);
    expect(jobs[0].status).toBe("sent");
    expect(jobs[0].provider_message_id).toBe("msg_123");
    // La relance suivante est programmée et le devis passe « Relancé »
    expect(jobs[1]?.sequence).toBe(2);
    expect(jobs[1]?.status).toBe("scheduled");
    const { data: quote } = await admin.from("quotes").select("status, followup_count").eq("id", q.id).single();
    expect(quote).toMatchObject({ status: "followed_up", followup_count: 1 });
    const { data: comm } = await admin.from("communication_events").select("kind, delivery_status").eq("quote_id", q.id);
    expect(comm).toEqual([{ kind: "followup_sent", delivery_status: "sent" }]);
    // Un nouvel envoi est refusé
    await expect(sendApprovedJob(db, sender, job.id)).rejects.toThrow();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("gère l'échec du fournisseur : statut « En erreur », notification, aucun effet sur le devis", async () => {
    sendEmail.mockResolvedValue({ ok: false, error: "Adresse rejetée par le fournisseur", retryable: false });
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await approveJob(db, ctx(), job.id);
    const res = await sendApprovedJob(db, { ...ctx(), isDemo: false, fromName: "Clim Test", replyTo: null }, job.id);
    expect(res).toEqual({ status: "failed", error: "Adresse rejetée par le fournisseur" });
    const [j] = await jobsOf(q.id);
    expect(j.status).toBe("failed");
    expect(j.last_error).toContain("rejetée");
    const { data: quote } = await admin.from("quotes").select("followup_count").eq("id", q.id).single();
    expect(quote!.followup_count).toBe(0);
    const { data: notifs } = await admin.from("notifications").select("type").eq("organization_id", org.orgId).eq("type", "send_failed");
    expect((notifs ?? []).length).toBeGreaterThan(0);
    // Nouvelle tentative possible après revalidation
    sendEmail.mockResolvedValue({ ok: true, providerMessageId: "msg_retry" });
    await approveJob(db, ctx(), job.id);
    expect((await sendApprovedJob(db, { ...ctx(), isDemo: false, fromName: "Clim Test", replyTo: null }, job.id)).status).toBe("sent");
  });

  it("interdit tout envoi réel en mode démonstration", async () => {
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await approveJob(db, ctx(), job.id);
    await expect(sendApprovedJob(db, { ...ctx(), isDemo: true, fromName: "x", replyTo: null }, job.id)).rejects.toThrow(/démonstration/);
    await admin.from("organizations").update({ is_demo: true }).eq("id", org.orgId);
    const { error } = await db.from("followup_jobs").update({ status: "sending" }).eq("id", job.id);
    expect(error?.message).toMatch(/démonstration/);
    await admin.from("organizations").update({ is_demo: false }).eq("id", org.orgId);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("hors fenêtre horaire, la relance validée est mise en file et non envoyée", async () => {
    await admin.from("followup_policies").update({ window_start_minutes: 0, window_end_minutes: 1 }).eq("organization_id", org.orgId);
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await approveJob(db, ctx(), job.id);
    const res = await sendApprovedJob(db, { ...ctx(), isDemo: false, fromName: "x", replyTo: null }, job.id, { now: new Date("2026-11-18T12:00:00Z") });
    expect(res.status).toBe("queued");
    expect(sendEmail).not.toHaveBeenCalled();
    const [j] = await jobsOf(q.id);
    expect(j.status).toBe("approved");
    await admin.from("followup_policies").update({ window_start_minutes: 0, window_end_minutes: 1440 }).eq("organization_id", org.orgId);
  });
});

describe("mode manuel et arrêts", () => {
  it("« Marquer comme envoyé » enregistre l'action et programme la suivante", async () => {
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await markJobSentManually(db, ctx(), job.id, { channel: "manual" });
    const jobs = await jobsOf(q.id);
    expect(jobs[0]).toMatchObject({ status: "sent", channel: "manual", approved_by: org.owner.id });
    expect(jobs[1]).toMatchObject({ sequence: 2, status: "scheduled" });
    const { data: comm } = await admin.from("communication_events").select("kind").eq("quote_id", q.id);
    expect(comm).toEqual([{ kind: "followup_manual" }]);
  });

  it("l'acceptation annule les relances futures", async () => {
    const q = await makeQuote();
    await dueJob(q.id);
    await changeQuoteStatus(db, ctx(), q.id, "accepted");
    const jobs = await jobsOf(q.id);
    expect(jobs.every((j) => j.status === "cancelled")).toBe(true);
    const { data: quote } = await admin.from("quotes").select("status, next_followup_at, accepted_at").eq("id", q.id).single();
    expect(quote!.status).toBe("accepted");
    expect(quote!.next_followup_at).toBeNull();
    expect(quote!.accepted_at).not.toBeNull();
    // Aucune nouvelle relance ne peut être créée pour ce devis
    const { error } = await db.from("followup_jobs").insert({ organization_id: org.orgId, quote_id: q.id, sequence: 3, scheduled_for: new Date().toISOString() });
    expect(error?.message).toMatch(/cycle de relance/);
  });

  it("le refus annule les relances (même en accès direct à la base)", async () => {
    const q = await makeQuote();
    await syncQuoteFollowups(db, q.id);
    await db.from("quotes").update({ status: "declined", lost_reason: "prix" }).eq("id", q.id);
    const jobs = await jobsOf(q.id);
    expect(jobs[0].status).toBe("cancelled");
    expect(jobs[0].cancelled_reason).toBe("devis_declined");
  });

  it("« Le client a répondu » suspend les relances (statut En attente)", async () => {
    const q = await makeQuote();
    await dueJob(q.id);
    await recordReply(db, ctx(), q.id, { channel: "phone", summary: "Rappeler vendredi" });
    const { data: quote } = await admin.from("quotes").select("status, replied_at").eq("id", q.id).single();
    expect(quote!.status).toBe("pending");
    expect((await jobsOf(q.id))[0].status).toBe("cancelled");
    // Reprise : la relance est reprogrammée
    await changeQuoteStatus(db, ctx(), q.id, "sent");
    expect((await jobsOf(q.id))[0].status).toBe("scheduled");
  });

  it("l'opposition du destinataire stoppe toutes ses relances", async () => {
    const q = await makeQuote();
    await dueJob(q.id);
    await db.from("customers").update({ do_not_contact: true }).eq("id", q.customer_id);
    expect((await jobsOf(q.id))[0].status).toBe("cancelled");
    await expect(setFollowupsPaused(db, ctx(), q.id, false)).rejects.toThrow(/opposé/);
  });

  it("suspendre puis reprendre", async () => {
    const q = await makeQuote({ sent_at: daysAgo(1) });
    await syncQuoteFollowups(db, q.id);
    await setFollowupsPaused(db, ctx(), q.id, true);
    expect((await jobsOf(q.id))[0].status).toBe("cancelled");
    await setFollowupsPaused(db, ctx(), q.id, false);
    expect((await jobsOf(q.id))[0].status).toBe("scheduled");
  });

  it("reporter et ignorer", async () => {
    const q = await makeQuote();
    const job = await dueJob(q.id);
    const until = new Date(Date.now() + 5 * 86_400_000);
    await snoozeJob(db, ctx(), job.id, until);
    let [j] = await jobsOf(q.id);
    expect(j.status).toBe("scheduled");
    expect(new Date(j.scheduled_for).getTime()).toBeGreaterThan(Date.now());
    await skipJob(db, ctx(), job.id);
    const jobs = await jobsOf(q.id);
    [j] = jobs;
    expect(j.status).toBe("skipped");
    expect(jobs[1]).toMatchObject({ sequence: 2, status: "scheduled" });
  });

  it("le nombre maximal de relances est respecté", async () => {
    await admin.from("followup_policies").update({ max_followups: 1 }).eq("organization_id", org.orgId);
    const q = await makeQuote();
    const job = await dueJob(q.id);
    await markJobSentManually(db, ctx(), job.id, { channel: "phone" });
    expect(await jobsOf(q.id)).toHaveLength(1);
    await admin.from("followup_policies").update({ max_followups: 3 }).eq("organization_id", org.orgId);
  });

  it("expire les devis dont la date de validité est dépassée", async () => {
    const q = await makeQuote({ issued_on: "2026-01-01", expires_on: "2026-02-01", sent_at: "2026-01-02T10:00:00Z" });
    await syncQuoteFollowups(db, q.id);
    await expireOverdueQuotes(db, { organizationId: org.orgId });
    const { data } = await admin.from("quotes").select("status").eq("id", q.id).single();
    expect(data!.status).toBe("expired");
    expect((await jobsOf(q.id)).every((j) => j.status === "cancelled")).toBe(true);
  });
});
