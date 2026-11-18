import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createOrg, createUser, deleteOrg } from "./helpers";
import { createDemoOrganization, clearDemoData, seedDemoData } from "@/lib/demo/seed";
import { loadStatsData } from "@/lib/queries/stats";
import { computePeriodStats, computeSnapshot } from "@/lib/domain/stats";

describe("mode démonstration", () => {
  let demoOrg: string;
  let user: Awaited<ReturnType<typeof createUser>>;

  beforeAll(async () => {
    user = await createUser("Visiteur démo");
    demoOrg = await createDemoOrganization(admin, user.id);
  });
  afterAll(() => deleteOrg(demoOrg));

  it("génère 20 à 30 devis cohérents avec clients, relances et historique", async () => {
    const { data: quotes } = await user.client.from("quotes").select("status, sent_at, accepted_at, declined_at, next_followup_at");
    expect(quotes!.length).toBeGreaterThanOrEqual(20);
    expect(quotes!.length).toBeLessThanOrEqual(30);
    const statuses = new Set(quotes!.map((q) => q.status));
    for (const s of ["draft", "accepted", "declined", "pending"]) expect(statuses.has(s)).toBe(true);
    // Cohérence : tout devis non brouillon a une date d'envoi ; accepté ⇒ date d'acceptation
    for (const q of quotes!) {
      if (q.status !== "draft" && q.status !== "cancelled") expect(q.sent_at).not.toBeNull();
      if (q.status === "accepted") expect(q.accepted_at).not.toBeNull();
      if (["accepted", "declined", "expired", "cancelled", "pending", "draft"].includes(q.status)) expect(q.next_followup_at).toBeNull();
      if (q.sent_at) expect(new Date(q.sent_at).getTime()).toBeLessThanOrEqual(Date.now());
    }
    const { data: jobs } = await user.client.from("followup_jobs").select("status");
    expect(jobs!.some((j) => j.status === "pending_approval")).toBe(true);
    const { count } = await user.client.from("activity_events").select("id", { count: "exact", head: true });
    expect(count).toBeGreaterThan(30);
  });

  it("est isolée des autres entreprises", async () => {
    const other = await createOrg("Réelle");
    const { data } = await other.owner.client.from("quotes").select("id");
    expect(data).toEqual([]);
    await deleteOrg(other.orgId);
  });

  it("la réinitialisation régénère les données et refuse une entreprise réelle", async () => {
    await user.client.from("quotes").update({ title: "modifié" }).neq("id", "00000000-0000-0000-0000-000000000000");
    await clearDemoData(admin, demoOrg);
    await seedDemoData(admin, demoOrg, user.id);
    const { data } = await user.client.from("quotes").select("title").eq("title", "modifié");
    expect(data).toEqual([]);
    const real = await createOrg("Réelle 2");
    await expect(clearDemoData(admin, real.orgId)).rejects.toThrow(/démonstration/);
    await deleteOrg(real.orgId);
  });
});

describe("exactitude des statistiques sur la base", () => {
  let org: Awaited<ReturnType<typeof createOrg>>;
  beforeAll(async () => {
    org = await createOrg("Stats");
    const db = org.owner.client;
    const { data: c } = await db.from("customers").insert({ organization_id: org.orgId, name: "C" }).select("id").single();
    const base = { organization_id: org.orgId, customer_id: c!.id, title: "t", amount_ttc_cents: 999999 };
    const now = Date.now();
    const iso = (d: number) => new Date(now - d * 86_400_000).toISOString();
    await db.from("quotes").insert([
      { ...base, reference: "S1", amount_ht_cents: 100000, status: "sent", sent_at: iso(5) },
      { ...base, reference: "S2", amount_ht_cents: 200000, status: "pending", sent_at: iso(6) },
      { ...base, reference: "S3", amount_ht_cents: 300000, status: "accepted", sent_at: iso(20), accepted_at: iso(2) },
      { ...base, reference: "S4", amount_ht_cents: 400000, status: "declined", sent_at: iso(15), declined_at: iso(3) },
      { ...base, reference: "S5", amount_ht_cents: 500000, status: "draft" },
      { ...base, reference: "S6", amount_ht_cents: 600000, status: "accepted", sent_at: iso(200), accepted_at: iso(180) },
    ]);
  });
  afterAll(() => deleteOrg(org.orgId));

  it("calcule ouverts, acceptés, taux et montants", async () => {
    const data = await loadStatsData(org.owner.client, org.orgId);
    const snap = computeSnapshot(data.quotes);
    expect(snap.openCount).toBe(2);
    expect(snap.openAmountCents).toBe(300000);
    expect(snap.draftCount).toBe(1);
    const p = computePeriodStats(data.quotes, data.followups, data.replies, { from: new Date(Date.now() - 30 * 86_400_000), to: new Date() });
    expect(p.sentCount).toBe(4);
    expect(p.acceptedCount).toBe(1);
    expect(p.acceptedAmountCents).toBe(300000);
    expect(p.decidedCount).toBe(2);
    expect(p.acceptanceRate).toBe(0.5);
  });

  it("les filtres collaborateur / prestation sont appliqués côté base", async () => {
    const data = await loadStatsData(org.owner.client, org.orgId, { serviceType: "plomberie" });
    expect(data.quotes).toHaveLength(0);
  });
});
