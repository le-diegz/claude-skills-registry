import { describe, expect, it } from "vitest";
import { computePeriodStats, computeSnapshot, computeMonthlySeries, type StatsQuote } from "@/lib/domain/stats";
import { findDuplicateCustomers, normalizePhone } from "@/lib/domain/contact";

const q = (over: Partial<StatsQuote>): StatsQuote => ({
  id: Math.random().toString(36).slice(2),
  status: "sent",
  amount_ht_cents: 100000,
  issued_on: "2026-11-01",
  sent_at: "2026-11-02T10:00:00Z",
  accepted_at: null,
  declined_at: null,
  replied_at: null,
  owner_id: null,
  service_type: "climatisation",
  followup_count: 0,
  last_followup_at: null,
  next_followup_at: null,
  lost_reason: null,
  updated_at: "2026-11-02T10:00:00Z",
  ...over,
});

describe("statistiques", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  const quotes: StatsQuote[] = [
    q({ id: "a", status: "sent", next_followup_at: "2026-11-18T08:00:00Z" }), // dû aujourd'hui
    q({ id: "b", status: "followed_up", next_followup_at: "2026-11-10T08:00:00Z", amount_ht_cents: 200000 }), // en retard
    q({ id: "c", status: "pending", amount_ht_cents: 50000 }),
    q({ id: "d", status: "accepted", accepted_at: "2026-11-15T10:00:00Z", amount_ht_cents: 300000, followup_count: 1 }),
    q({ id: "e", status: "declined", declined_at: "2026-11-12T10:00:00Z", lost_reason: "prix" }),
    q({ id: "f", status: "draft", sent_at: null }),
  ];

  it("snapshot : ouverts, montants, échéances", () => {
    const s = computeSnapshot(quotes, now);
    expect(s.openCount).toBe(3);
    expect(s.openAmountCents).toBe(350000);
    expect(s.dueTodayCount).toBe(2);
    expect(s.overdueCount).toBe(1);
    expect(s.draftCount).toBe(1);
  });

  it("période : taux d'acceptation sur devis tranchés et relances", () => {
    const followups = [{ quote_id: "d", status: "sent", sent_at: "2026-11-08T08:00:00Z" }];
    const replies = [{ quote_id: "d", occurred_at: "2026-11-10T10:00:00Z" }];
    const s = computePeriodStats(quotes, followups, replies, { from: new Date("2026-11-01T00:00:00Z"), to: now });
    expect(s.sentCount).toBe(5);
    expect(s.acceptedCount).toBe(1);
    expect(s.decidedCount).toBe(2);
    expect(s.acceptanceRate).toBe(0.5);
    expect(s.acceptedAmountCents).toBe(300000);
    expect(s.followupsSent).toBe(1);
    expect(s.repliesAfterFollowup).toBe(1);
    expect(s.acceptedAfterFollowup).toBe(1);
    expect(s.avgResponseDays).toBe(9); // d : 8 j (réponse), e : 10 j (refus)
    expect(s.responseSampleSize).toBe(2);
  });

  it("aucune donnée : pas de taux inventé", () => {
    const s = computePeriodStats([], [], [], { from: new Date("2026-11-01T00:00:00Z"), to: now });
    expect(s.acceptanceRate).toBeNull();
    expect(s.avgResponseDays).toBeNull();
  });

  it("série mensuelle", () => {
    const series = computeMonthlySeries(quotes, [], 3, now);
    expect(series.map((p) => p.key)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(series[2].sent).toBe(5);
    expect(series[2].accepted).toBe(1);
  });
});

describe("doublons clients", () => {
  const existing = [
    { id: "1", name: "Claire Martin", email: "Claire.Martin@exemple.fr", phone: "06 12 34 56 78" },
    { id: "2", name: "SARL Dupont", email: null, phone: null },
  ];
  it("par email, téléphone et nom", () => {
    expect(findDuplicateCustomers({ name: "X", email: "claire.martin@exemple.fr" }, existing)[0].reason).toBe("email");
    expect(findDuplicateCustomers({ name: "X", phone: "+33 6 12 34 56 78" }, existing)[0].reason).toBe("phone");
    expect(findDuplicateCustomers({ name: "dupont" }, existing)[0].reason).toBe("name");
    expect(findDuplicateCustomers({ name: "Claire Martin" }, existing, "1")).toEqual([]);
  });
  it("normalise les téléphones", () => {
    expect(normalizePhone("+33 (0)6 12 34 56 78")).toBe("0612345678");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("0612345678");
    expect(normalizePhone("0033612345678")).toBe("0612345678");
  });
});
