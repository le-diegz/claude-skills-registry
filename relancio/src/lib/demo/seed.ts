import "server-only";
import type { Db } from "@/lib/db";
import type { QuoteStatus, ServiceType, LostReason, CustomerType } from "@/lib/domain/constants";
import { computeTtcCents } from "@/lib/domain/money";
import { parisDateTime, toParis, addDaysToDateOnly, todayParis } from "@/lib/domain/dates";
import { prepareDueFollowups, syncQuoteFollowups } from "@/lib/services/followups";

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour des démos reproductibles. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_ORGANIZATION = {
  name: "AéroClim Méditerranée",
  legal_name: "AéroClim Méditerranée SARL (fictive)",
  city: "Montpellier",
  postal_code: "34000",
  address_line: "12 rue des Artisans",
  phone: "04 67 00 00 00",
  trades: ["climatisation", "pompe_a_chaleur", "entretien"],
};

const CUSTOMERS: { name: string; company?: string; type: CustomerType; city: string; phone: string }[] = [
  { name: "Claire Martin", type: "particulier", city: "Montpellier", phone: "06 11 22 33 44" },
  { name: "Karim Benali", type: "particulier", city: "Castelnau-le-Lez", phone: "06 21 32 43 54" },
  { name: "Sophie Durand", type: "particulier", city: "Lattes", phone: "06 31 42 53 64" },
  { name: "Thomas Leroy", company: "Cabinet Leroy Kiné", type: "professionnel", city: "Montpellier", phone: "04 67 11 22 33" },
  { name: "Isabelle Fabre", type: "particulier", city: "Pérols", phone: "06 41 52 63 74" },
  { name: "Marc Rouvière", company: "Boulangerie Rouvière", type: "professionnel", city: "Mauguio", phone: "04 67 22 33 44" },
  { name: "Nadia Haddad", type: "particulier", city: "Juvignac", phone: "06 51 62 73 84" },
  { name: "Jean-Pierre Vidal", type: "particulier", city: "Saint-Jean-de-Védas", phone: "06 61 72 83 94" },
  { name: "Élodie Garcia", company: "Syndic Les Pins", type: "syndic", city: "Montpellier", phone: "04 67 33 44 55" },
  { name: "Lucas Moreau", type: "particulier", city: "Grabels", phone: "06 71 82 93 04" },
  { name: "Hélène Bonnet", type: "particulier", city: "Palavas-les-Flots", phone: "06 81 92 03 14" },
  { name: "Antoine Roux", company: "Agence Roux Immobilier", type: "professionnel", city: "Montpellier", phone: "04 67 44 55 66" },
  { name: "Camille Petit", type: "particulier", city: "Clapiers", phone: "06 91 02 13 24" },
  { name: "Mairie de Vendargues", company: "Commune de Vendargues", type: "collectivite", city: "Vendargues", phone: "04 67 55 66 77" },
  { name: "Julie Lambert", type: "particulier", city: "Montferrier-sur-Lez", phone: "07 12 23 34 45" },
  { name: "Olivier Mercier", type: "particulier", city: "Baillargues", phone: "07 22 33 44 55" },
  { name: "Sarah Cohen", company: "Pharmacie du Lez", type: "professionnel", city: "Montpellier", phone: "04 67 66 77 88" },
  { name: "Paul Girard", type: "particulier", city: "Teyran", phone: "07 32 43 54 65" },
];

const TITLES: Record<ServiceType, string[]> = {
  climatisation: [
    "Climatisation réversible mono-split séjour",
    "Multisplit 3 unités — chambres et séjour",
    "Climatisation gainable maison 110 m²",
    "Remplacement unité extérieure climatisation",
    "Climatisation cabinet — 2 salles de soin",
  ],
  pompe_a_chaleur: [
    "Pompe à chaleur air/eau 11 kW avec ballon",
    "PAC air/eau en remplacement chaudière fioul",
    "Pompe à chaleur air/air 4 unités",
  ],
  entretien: ["Contrat d'entretien annuel climatisation (3 unités)", "Entretien PAC + contrôle étanchéité"],
  chauffage: ["Remplacement radiateurs + régulation"],
  plomberie: ["Ballon thermodynamique 200 L"],
  depannage: ["Dépannage fuite fluide frigorigène"],
  autre: ["Étude thermique et préconisations"],
};

interface DemoQuotePlan {
  status: QuoteStatus;
  sentDaysAgo: number | null;
  followupsSent: number;
  service: ServiceType;
  ht: number;
  vat: number;
  decidedDaysAgo?: number;
  lostReason?: LostReason;
  repliedDaysAgo?: number;
}

const PLAN: DemoQuotePlan[] = [
  // Brouillons
  { status: "draft", sentDaysAgo: null, followupsSent: 0, service: "climatisation", ht: 4280, vat: 1000 },
  { status: "draft", sentDaysAgo: null, followupsSent: 0, service: "pompe_a_chaleur", ht: 13900, vat: 550 },
  { status: "draft", sentDaysAgo: null, followupsSent: 0, service: "entretien", ht: 390, vat: 1000 },
  // Envoyés récemment (1re relance programmée)
  { status: "sent", sentDaysAgo: 1, followupsSent: 0, service: "climatisation", ht: 3450, vat: 1000 },
  { status: "sent", sentDaysAgo: 2, followupsSent: 0, service: "pompe_a_chaleur", ht: 12800, vat: 550 },
  { status: "sent", sentDaysAgo: 0, followupsSent: 0, service: "climatisation", ht: 6980, vat: 2000 },
  { status: "sent", sentDaysAgo: 2, followupsSent: 0, service: "plomberie", ht: 2350, vat: 1000 },
  // À relancer (échéance passée)
  { status: "sent", sentDaysAgo: 5, followupsSent: 0, service: "climatisation", ht: 5120, vat: 1000 },
  { status: "sent", sentDaysAgo: 8, followupsSent: 0, service: "pompe_a_chaleur", ht: 14650, vat: 550 },
  { status: "sent", sentDaysAgo: 6, followupsSent: 0, service: "climatisation", ht: 8900, vat: 2000 },
  { status: "followed_up", sentDaysAgo: 19, followupsSent: 1, service: "climatisation", ht: 7400, vat: 1000 },
  { status: "followed_up", sentDaysAgo: 30, followupsSent: 2, service: "pompe_a_chaleur", ht: 11200, vat: 550 },
  // Relancés, prochaine relance à venir
  { status: "followed_up", sentDaysAgo: 9, followupsSent: 1, service: "climatisation", ht: 3890, vat: 1000 },
  { status: "followed_up", sentDaysAgo: 11, followupsSent: 1, service: "chauffage", ht: 5600, vat: 1000 },
  // En attente (client a répondu)
  { status: "pending", sentDaysAgo: 12, followupsSent: 1, service: "pompe_a_chaleur", ht: 15800, vat: 550, repliedDaysAgo: 2 },
  { status: "pending", sentDaysAgo: 7, followupsSent: 0, service: "climatisation", ht: 4650, vat: 2000, repliedDaysAgo: 1 },
  // Acceptés (sur plusieurs mois)
  { status: "accepted", sentDaysAgo: 20, followupsSent: 1, service: "climatisation", ht: 6200, vat: 1000, decidedDaysAgo: 9 },
  { status: "accepted", sentDaysAgo: 45, followupsSent: 0, service: "entretien", ht: 480, vat: 1000, decidedDaysAgo: 40 },
  { status: "accepted", sentDaysAgo: 70, followupsSent: 2, service: "pompe_a_chaleur", ht: 13400, vat: 550, decidedDaysAgo: 52 },
  { status: "accepted", sentDaysAgo: 100, followupsSent: 1, service: "climatisation", ht: 9800, vat: 2000, decidedDaysAgo: 88 },
  { status: "accepted", sentDaysAgo: 130, followupsSent: 0, service: "climatisation", ht: 3150, vat: 1000, decidedDaysAgo: 124 },
  { status: "accepted", sentDaysAgo: 160, followupsSent: 1, service: "depannage", ht: 640, vat: 1000, decidedDaysAgo: 150 },
  // Refusés
  { status: "declined", sentDaysAgo: 35, followupsSent: 2, service: "pompe_a_chaleur", ht: 16200, vat: 550, decidedDaysAgo: 18, lostReason: "prix" },
  { status: "declined", sentDaysAgo: 60, followupsSent: 1, service: "climatisation", ht: 5400, vat: 1000, decidedDaysAgo: 49, lostReason: "concurrent" },
  { status: "declined", sentDaysAgo: 95, followupsSent: 3, service: "climatisation", ht: 7100, vat: 2000, decidedDaysAgo: 70, lostReason: "projet_reporte" },
  // Expiré / annulé
  { status: "expired", sentDaysAgo: 75, followupsSent: 3, service: "autre", ht: 890, vat: 2000, decidedDaysAgo: 45 },
  { status: "cancelled", sentDaysAgo: 40, followupsSent: 0, service: "climatisation", ht: 2900, vat: 1000, decidedDaysAgo: 30 },
];

const DAY = 86_400_000;

function at(now: Date, daysAgo: number, minutes: number) {
  const p = toParis(new Date(now.getTime() - daysAgo * DAY));
  const d = parisDateTime(p.getFullYear(), p.getMonth(), p.getDate(), minutes);
  // Jamais dans le futur : l'historique fictif doit rester cohérent avec l'heure actuelle
  return d.getTime() > now.getTime() - 10 * 60_000 ? new Date(now.getTime() - (daysAgo + 1) * 30 * 60_000) : d;
}

/** Supprime toutes les données métier d'une organisation de démonstration. */
export async function clearDemoData(admin: Db, organizationId: string) {
  const { data: org } = await admin.from("organizations").select("is_demo").eq("id", organizationId).single();
  if (!org?.is_demo) throw new Error("Refus : l'organisation n'est pas une démonstration.");
  for (const table of ["notifications", "activity_events", "communication_events", "followup_jobs", "quote_attachments", "import_rows", "import_jobs"] as const) {
    await admin.from(table).delete().eq("organization_id", organizationId);
  }
  await admin.from("quotes").delete().eq("organization_id", organizationId);
  await admin.from("customers").delete().eq("organization_id", organizationId);
}

/** Génère un jeu de données fictif cohérent, relatif à la date du jour. */
export async function seedDemoData(admin: Db, organizationId: string, userId: string, now: Date = new Date()) {
  const random = rng(42);
  const { data: org } = await admin.from("organizations").select("is_demo").eq("id", organizationId).single();
  if (!org?.is_demo) throw new Error("Refus : l'organisation n'est pas une démonstration.");

  const { data: customers, error: cErr } = await admin
    .from("customers")
    .insert(
      CUSTOMERS.map((c, i) => ({
        organization_id: organizationId,
        name: c.name,
        company_name: c.company ?? null,
        email: `${c.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@demo.invalid`,
        phone: c.phone,
        city: c.city,
        postal_code: "34000",
        customer_type: c.type,
        // Un client sans email pour illustrer la relance téléphonique
        ...(i === 15 ? { email: null } : {}),
        created_by: userId,
        created_at: new Date(now.getTime() - (170 - i * 5) * DAY).toISOString(),
      })),
    )
    .select("id, name");
  if (cErr) throw new Error(cErr.message);

  const year = todayParis(now).slice(0, 4);
  const quotesToSync: string[] = [];
  let ref = 120;

  for (let i = 0; i < PLAN.length; i++) {
    const p = PLAN[i];
    const customer = customers![i % customers!.length];
    const titles = TITLES[p.service];
    const title = titles[Math.floor(random() * titles.length)];
    const htCents = p.ht * 100 + Math.floor(random() * 10) * 10 * 100;
    const issuedDaysAgo = (p.sentDaysAgo ?? Math.floor(random() * 3)) + (random() > 0.6 ? 1 : 0);
    const issuedOn = todayParis(new Date(now.getTime() - issuedDaysAgo * DAY));
    const sentAt = p.sentDaysAgo === null ? null : at(now, p.sentDaysAgo, 10 * 60 + Math.floor(random() * 300));
    const decidedAt = p.decidedDaysAgo !== undefined ? at(now, p.decidedDaysAgo, 15 * 60) : null;
    ref++;

    // Historique des relances déjà effectuées
    const followupDates: Date[] = [];
    if (sentAt) {
      let cursor = sentAt.getTime();
      for (let k = 0; k < p.followupsSent; k++) {
        cursor += (k === 0 ? 3 : 7) * DAY + 2 * DAY;
        const limit = decidedAt ? decidedAt.getTime() - DAY : now.getTime() - DAY;
        followupDates.push(new Date(Math.min(cursor, limit)));
      }
    }
    const lastFollowup = followupDates.at(-1) ?? null;

    const { data: quote, error: qErr } = await admin
      .from("quotes")
      .insert({
        organization_id: organizationId,
        customer_id: customer.id,
        reference: `DEV-${year}-${String(ref).padStart(4, "0")}`,
        title,
        service_type: p.service,
        description: p.service === "pompe_a_chaleur" ? "Dossier d'aides à constituer avec le client (montants indicatifs)." : null,
        amount_ht_cents: htCents,
        vat_rate_bp: p.vat,
        amount_ttc_cents: computeTtcCents(htCents, p.vat),
        issued_on: issuedOn,
        sent_at: sentAt?.toISOString() ?? null,
        expires_on: addDaysToDateOnly(issuedOn, p.status === "expired" ? 30 : 45),
        status: p.status,
        owner_id: userId,
        followup_count: p.followupsSent,
        last_followup_at: lastFollowup?.toISOString() ?? null,
        accepted_at: p.status === "accepted" ? decidedAt?.toISOString() : null,
        declined_at: p.status === "declined" ? decidedAt?.toISOString() : null,
        replied_at: p.repliedDaysAgo !== undefined ? at(now, p.repliedDaysAgo, 11 * 60).toISOString() : null,
        lost_reason: p.lostReason ?? null,
        source: "demo",
        created_by: userId,
        created_at: at(now, issuedDaysAgo, 9 * 60).toISOString(),
      })
      .select("id, reference")
      .single();
    if (qErr) throw new Error(qErr.message);

    const activities: Record<string, unknown>[] = [
      { type: "quote_created", message: `Devis ${quote!.reference} créé`, created_at: at(now, issuedDaysAgo, 9 * 60).toISOString() },
    ];
    if (sentAt) activities.push({ type: "quote_status_changed", message: `Devis ${quote!.reference} envoyé au client`, created_at: sentAt.toISOString() });

    for (let k = 0; k < followupDates.length; k++) {
      const d = followupDates[k];
      const { data: job } = await admin
        .from("followup_jobs")
        .insert({
          organization_id: organizationId,
          quote_id: quote!.id,
          sequence: k + 1,
          status: "sent",
          channel: k === 1 ? "phone" : "email",
          scheduled_for: d.toISOString(),
          subject: `Votre devis ${quote!.reference}`,
          body: `Bonjour ${customer.name},\n\nJe reviens vers vous au sujet de notre devis ${quote!.reference}.\n\nBien cordialement,\n${DEMO_ORGANIZATION.name}`,
          recipient_email: null,
          approved_by: userId,
          approved_at: d.toISOString(),
          sent_at: d.toISOString(),
          sent_by: userId,
        })
        .select("id")
        .single();
      await admin.from("communication_events").insert({
        organization_id: organizationId,
        quote_id: quote!.id,
        customer_id: customer.id,
        followup_job_id: job?.id ?? null,
        direction: "outbound",
        channel: k === 1 ? "phone" : "manual",
        kind: "followup_manual",
        subject: `Votre devis ${quote!.reference}`,
        occurred_at: d.toISOString(),
        actor_id: userId,
      });
      activities.push({
        type: "followup_sent",
        message: k === 1 ? `Relance n°${k + 1} effectuée par téléphone` : `Relance n°${k + 1} marquée comme envoyée manuellement`,
        created_at: d.toISOString(),
      });
    }

    if (p.repliedDaysAgo !== undefined || (p.status === "accepted" && p.followupsSent > 0)) {
      const replyAt = p.repliedDaysAgo !== undefined ? at(now, p.repliedDaysAgo, 11 * 60) : new Date(decidedAt!.getTime() - DAY / 2);
      await admin.from("communication_events").insert({
        organization_id: organizationId,
        quote_id: quote!.id,
        customer_id: customer.id,
        direction: "inbound",
        channel: "phone",
        kind: "reply",
        summary: p.status === "pending" ? "Souhaite comparer avec un autre devis, rappel prévu en fin de semaine." : "Accord de principe par téléphone.",
        occurred_at: replyAt.toISOString(),
        actor_id: userId,
      });
      activities.push({ type: "reply_recorded", message: `Réponse du client enregistrée sur ${quote!.reference}`, created_at: replyAt.toISOString() });
    }
    if (p.status === "accepted") activities.push({ type: "quote_accepted", message: `Devis ${quote!.reference} accepté`, created_at: decidedAt!.toISOString() });
    if (p.status === "declined") activities.push({ type: "quote_declined", message: `Devis ${quote!.reference} refusé`, created_at: decidedAt!.toISOString() });
    if (p.status === "expired") activities.push({ type: "quote_status_changed", message: `Devis ${quote!.reference} expiré`, created_at: decidedAt!.toISOString() });
    if (p.status === "cancelled") activities.push({ type: "quote_status_changed", message: `Devis ${quote!.reference} annulé`, created_at: decidedAt!.toISOString() });

    await admin.from("activity_events").insert(
      activities.map((a) => ({
        organization_id: organizationId,
        quote_id: quote!.id,
        customer_id: customer.id,
        actor_id: userId,
        type: a.type as string,
        message: a.message as string,
        created_at: a.created_at as string,
      })),
    );

    if (["sent", "followed_up"].includes(p.status)) quotesToSync.push(quote!.id);
  }

  for (const id of quotesToSync) await syncQuoteFollowups(admin, id, { actorId: null });
  await prepareDueFollowups(admin, { organizationId, now });
  return { customers: customers!.length, quotes: PLAN.length };
}

/** Crée une organisation de démonstration complète pour un utilisateur. */
export async function createDemoOrganization(admin: Db, userId: string, now: Date = new Date()) {
  const { data: org, error } = await admin
    .from("organizations")
    .insert({
      ...DEMO_ORGANIZATION,
      email: "contact@demo.invalid",
      is_demo: true,
      onboarding_completed_at: now.toISOString(),
      onboarding_step: 4,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await admin.from("organization_members").insert({ organization_id: org!.id, user_id: userId, role: "owner" });
  await admin.rpc("seed_organization_defaults", { p_org: org!.id });
  await admin.from("integrations").update({ from_name: DEMO_ORGANIZATION.name, reply_to_email: "contact@demo.invalid" }).eq("organization_id", org!.id);
  await admin.from("profiles").update({ current_organization_id: org!.id }).eq("id", userId);
  await seedDemoData(admin, org!.id, userId, now);
  return org!.id;
}
