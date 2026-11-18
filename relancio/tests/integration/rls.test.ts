import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, admin, createCustomer, createOrg, createUser, deleteOrg, type Db } from "./helpers";

describe("isolation multi-entreprises (RLS)", () => {
  let a: Awaited<ReturnType<typeof createOrg>>;
  let b: Awaited<ReturnType<typeof createOrg>>;
  let quoteA: string;
  let customerA: string;

  beforeAll(async () => {
    a = await createOrg("Entreprise A");
    b = await createOrg("Entreprise B");
    const c = await createCustomer(a.owner.client, a.orgId, { name: "Client secret A" });
    customerA = c.id;
    const { data, error } = await a.owner.client
      .from("quotes")
      .insert({ organization_id: a.orgId, customer_id: c.id, reference: "A-1", title: "Clim", amount_ht_cents: 100000, amount_ttc_cents: 120000, status: "sent", sent_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    quoteA = data!.id;
  });
  afterAll(async () => {
    await deleteOrg(a.orgId);
    await deleteOrg(b.orgId);
  });

  it("une entreprise ne voit pas les clients ni les devis d'une autre", async () => {
    const { data: quotes } = await b.owner.client.from("quotes").select("id");
    const { data: customers } = await b.owner.client.from("customers").select("id");
    expect(quotes).toEqual([]);
    expect(customers).toEqual([]);
    const { data: direct } = await b.owner.client.from("quotes").select("*").eq("id", quoteA);
    expect(direct).toEqual([]);
  });

  it("une entreprise ne peut ni modifier ni supprimer les données d'une autre", async () => {
    await b.owner.client.from("quotes").update({ title: "piraté" }).eq("id", quoteA);
    await b.owner.client.from("quotes").delete().eq("id", quoteA);
    const { data } = await admin.from("quotes").select("title").eq("id", quoteA).single();
    expect(data!.title).toBe("Clim");
  });

  it("impossible d'insérer des données dans une autre entreprise", async () => {
    const { error } = await b.owner.client.from("customers").insert({ organization_id: a.orgId, name: "Intrus" });
    expect(error).not.toBeNull();
    const { error: e2 } = await b.owner.client.from("quotes").insert({ organization_id: b.orgId, customer_id: customerA, reference: "X", title: "x", amount_ht_cents: 1, amount_ttc_cents: 1 });
    expect(e2?.message).toMatch(/autre organisation/);
    const { error: e3 } = await b.owner.client.from("activity_events").insert({ organization_id: b.orgId, quote_id: quoteA, type: "x", message: "x" });
    expect(e3).not.toBeNull();
  });

  it("organization_id est immuable", async () => {
    const { error } = await a.owner.client.from("quotes").update({ organization_id: b.orgId }).eq("id", quoteA);
    expect(error).not.toBeNull();
  });

  it("un utilisateur sans entreprise ne voit rien", async () => {
    const stranger = await createUser("Inconnu");
    for (const t of ["organizations", "quotes", "customers", "followup_jobs", "activity_events", "audit_logs", "integrations"] as const) {
      const { data } = await (stranger.client as Db).from(t).select("id");
      expect(data, t).toEqual([]);
    }
  });

  it("le stockage des pièces jointes est isolé par entreprise", async () => {
    const path = `${a.orgId}/${quoteA}/test.pdf`;
    const { error } = await a.owner.client.storage.from("quote-attachments").upload(path, new Blob(["%PDF-1.4 test"], { type: "application/pdf" }));
    expect(error).toBeNull();
    const { data: leaked } = await b.owner.client.storage.from("quote-attachments").download(path);
    expect(leaked).toBeNull();
    const { error: upErr } = await b.owner.client.storage.from("quote-attachments").upload(`${a.orgId}/${quoteA}/intrus.pdf`, new Blob(["%PDF"], { type: "application/pdf" }));
    expect(upErr).not.toBeNull();
    const { data: signed } = await a.owner.client.storage.from("quote-attachments").createSignedUrl(path, 60);
    expect(signed?.signedUrl).toContain("token=");
  });

  it("le seau refuse les formats non autorisés", async () => {
    const { error } = await a.owner.client.storage.from("quote-attachments").upload(`${a.orgId}/${quoteA}/x.exe`, new Blob(["MZ"], { type: "application/x-msdownload" }));
    expect(error).not.toBeNull();
  });
});

describe("permissions par rôle", () => {
  let org: Awaited<ReturnType<typeof createOrg>>;
  let member: Awaited<ReturnType<typeof addMember>>;
  let adminUser: Awaited<ReturnType<typeof addMember>>;

  beforeAll(async () => {
    org = await createOrg("Entreprise Rôles");
    member = await addMember(org.orgId, "member");
    adminUser = await addMember(org.orgId, "admin");
  });
  afterAll(() => deleteOrg(org.orgId));

  it("un membre crée des devis mais ne peut pas en supprimer", async () => {
    const c = await createCustomer(member.client, org.orgId);
    const { data: q, error } = await member.client
      .from("quotes")
      .insert({ organization_id: org.orgId, customer_id: c.id, reference: "M-1", title: "t", amount_ht_cents: 1000, amount_ttc_cents: 1200 })
      .select("id")
      .single();
    expect(error).toBeNull();
    await member.client.from("quotes").delete().eq("id", q!.id);
    const { data } = await admin.from("quotes").select("id").eq("id", q!.id);
    expect(data).toHaveLength(1);
    await adminUser.client.from("quotes").delete().eq("id", q!.id);
    const { data: after } = await admin.from("quotes").select("id").eq("id", q!.id);
    expect(after).toHaveLength(0);
  });

  it("un membre ne peut pas modifier la politique, les modèles ni l'email", async () => {
    await member.client.from("followup_policies").update({ first_delay_days: 30 }).eq("organization_id", org.orgId);
    const { data: p } = await admin.from("followup_policies").select("first_delay_days").eq("organization_id", org.orgId).single();
    expect(p!.first_delay_days).toBe(3);
    await member.client.from("integrations").update({ enabled: true }).eq("organization_id", org.orgId);
    const { data: i } = await admin.from("integrations").select("enabled").eq("organization_id", org.orgId).single();
    expect(i!.enabled).toBe(false);
    const { error } = await member.client.from("followup_templates").insert({ organization_id: org.orgId, kind: "custom", name: "x", subject: "x", body: "x" });
    expect(error).not.toBeNull();
  });

  it("un membre ne peut pas se promouvoir ni lire le journal d'audit", async () => {
    await member.client.from("organization_members").update({ role: "owner" }).eq("user_id", member.id).eq("organization_id", org.orgId);
    const { data } = await admin.from("organization_members").select("role").eq("user_id", member.id).single();
    expect(data!.role).toBe("member");
    await admin.from("audit_logs").insert({ organization_id: org.orgId, actor_id: org.owner.id, action: "test" });
    const { data: logs } = await member.client.from("audit_logs").select("id");
    expect(logs).toEqual([]);
    const { data: adminLogs } = await adminUser.client.from("audit_logs").select("id");
    expect((adminLogs ?? []).length).toBeGreaterThan(0);
  });

  it("un administrateur ne peut pas nommer de propriétaire", async () => {
    await adminUser.client.from("organization_members").update({ role: "owner" }).eq("user_id", member.id).eq("organization_id", org.orgId);
    const { data } = await admin.from("organization_members").select("role").eq("user_id", member.id).single();
    expect(data!.role).toBe("member");
  });

  it("le dernier propriétaire ne peut pas être retiré", async () => {
    const { error } = await org.owner.client.from("organization_members").delete().eq("user_id", org.owner.id).eq("organization_id", org.orgId);
    expect(error?.message).toMatch(/au moins un propriétaire/);
  });

  it("un utilisateur ne lit pas les notifications d'un collègue", async () => {
    await admin.from("notifications").insert({ organization_id: org.orgId, user_id: org.owner.id, type: "info", title: "privé" });
    const { data } = await member.client.from("notifications").select("id");
    expect(data).toEqual([]);
  });
});
