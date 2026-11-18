import "server-only";
import type { Db } from "@/lib/db";
import type { TablesUpdate } from "@/lib/db/database.types";
import { ActionError, assertNoError } from "@/lib/actions";
import { canTransition } from "@/lib/domain/quote-status";
import { QUOTE_STATUS_LABELS, type LostReason, type QuoteStatus } from "@/lib/domain/constants";
import { parseAmountToCents } from "@/lib/domain/money";
import { dateOnlyToInstant, todayParis } from "@/lib/domain/dates";
import type { QuoteData } from "@/lib/validation/schemas";
import { logActivity } from "./activity";
import { syncQuoteFollowups } from "./followups";

interface Ctx {
  organizationId: string;
  userId: string;
}

/** Instant d'envoi à partir d'une date : maintenant si c'est aujourd'hui, sinon 10h à Paris. */
export function sentAtFromDate(dateOnly: string | null, now: Date = new Date()): string | null {
  if (!dateOnly) return null;
  if (dateOnly === todayParis(now)) return now.toISOString();
  return dateOnlyToInstant(dateOnly, 10 * 60).toISOString();
}

export async function suggestNextReference(db: Db, organizationId: string, now: Date = new Date()): Promise<string> {
  const year = todayParis(now).slice(0, 4);
  const prefix = `DEV-${year}-`;
  const { data } = await db
    .from("quotes")
    .select("reference")
    .eq("organization_id", organizationId)
    .ilike("reference", `${prefix}%`)
    .order("reference", { ascending: false })
    .limit(50);
  let max = 0;
  for (const r of data ?? []) {
    const n = Number(r.reference.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function resolveCustomer(db: Db, ctx: Ctx, data: QuoteData): Promise<string> {
  if (data.customer_id) {
    const { data: c } = await db.from("customers").select("id").eq("id", data.customer_id).eq("organization_id", ctx.organizationId).maybeSingle();
    if (!c) throw new ActionError("Client introuvable.");
    return c.id;
  }
  const nc = data.new_customer!;
  const { data: created, error } = await db
    .from("customers")
    .insert({
      organization_id: ctx.organizationId,
      name: nc.name,
      email: nc.email,
      phone: nc.phone,
      customer_type: nc.customer_type,
      created_by: ctx.userId,
    })
    .select("id, name")
    .single();
  assertNoError(error, "Création du client");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "customer_created",
    message: `Client ${created!.name} créé`,
    customerId: created!.id,
    actorId: ctx.userId,
  });
  return created!.id;
}

function amounts(data: QuoteData) {
  const ht = parseAmountToCents(data.amount_ht);
  const ttc = parseAmountToCents(data.amount_ttc);
  if (ht === null || ttc === null) throw new ActionError("Montants invalides.");
  return { amount_ht_cents: ht, amount_ttc_cents: ttc };
}

export async function createQuote(db: Db, ctx: Ctx, data: QuoteData) {
  if (!["draft", "sent", "pending", "accepted", "declined"].includes(data.status)) {
    throw new ActionError("Statut initial non autorisé.");
  }
  const customerId = await resolveCustomer(db, ctx, data);
  const sentOn = data.status === "draft" ? null : (data.sent_on ?? data.issued_on);
  const { data: quote, error } = await db
    .from("quotes")
    .insert({
      organization_id: ctx.organizationId,
      customer_id: customerId,
      reference: data.reference,
      title: data.title,
      service_type: data.service_type,
      description: data.description,
      ...amounts(data),
      vat_rate_bp: data.vat_rate_bp,
      issued_on: data.issued_on,
      sent_at: sentAtFromDate(sentOn),
      expires_on: data.expires_on,
      status: data.status,
      owner_id: data.owner_id ?? ctx.userId,
      notes: data.notes,
      lost_reason: data.status === "declined" ? (data.lost_reason as LostReason | null) : null,
      created_by: ctx.userId,
      source: "manual",
    })
    .select("id, reference")
    .single();
  if (error?.code === "23505") throw new ActionError(`La référence « ${data.reference} » existe déjà.`);
  assertNoError(error, "Création du devis");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "quote_created",
    message: `Devis ${quote!.reference} créé (${QUOTE_STATUS_LABELS[data.status]})`,
    quoteId: quote!.id,
    customerId,
    actorId: ctx.userId,
  });
  await syncQuoteFollowups(db, quote!.id, { actorId: ctx.userId });
  return quote!;
}

export async function updateQuote(db: Db, ctx: Ctx, quoteId: string, data: QuoteData) {
  const { data: current } = await db.from("quotes").select("*").eq("id", quoteId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!current) throw new ActionError("Devis introuvable.");
  const currentStatus = current.status as QuoteStatus;
  // Le statut « À relancer / Relancé » est conservé si l'utilisateur n'a pas changé de statut
  let nextStatus: QuoteStatus = data.status;
  if ((currentStatus === "to_follow_up" || currentStatus === "followed_up") && data.status === "sent") nextStatus = currentStatus;
  if (!canTransition(currentStatus, nextStatus)) {
    throw new ActionError(`Passage de « ${QUOTE_STATUS_LABELS[currentStatus]} » à « ${QUOTE_STATUS_LABELS[nextStatus]} » impossible.`);
  }
  const customerId = await resolveCustomer(db, ctx, data);
  const sentOn = nextStatus === "draft" ? null : (data.sent_on ?? (current.sent_at ? null : data.issued_on));
  const sentAt = nextStatus === "draft" ? null : sentOn ? sentAtFromDate(sentOn) : current.sent_at;
  const { error } = await db
    .from("quotes")
    .update({
      customer_id: customerId,
      reference: data.reference,
      title: data.title,
      service_type: data.service_type,
      description: data.description,
      ...amounts(data),
      vat_rate_bp: data.vat_rate_bp,
      issued_on: data.issued_on,
      sent_at: sentAt,
      expires_on: data.expires_on,
      status: nextStatus,
      owner_id: data.owner_id,
      notes: data.notes,
      lost_reason: data.lost_reason as LostReason | null,
    })
    .eq("id", quoteId)
    .eq("organization_id", ctx.organizationId);
  if (error?.code === "23505") throw new ActionError(`La référence « ${data.reference} » existe déjà.`);
  assertNoError(error, "Mise à jour du devis");
  const statusChanged = nextStatus !== currentStatus;
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: statusChanged ? statusEventType(nextStatus) : "quote_updated",
    message: statusChanged
      ? `Devis ${data.reference} : ${QUOTE_STATUS_LABELS[currentStatus]} → ${QUOTE_STATUS_LABELS[nextStatus]}`
      : `Devis ${data.reference} modifié`,
    quoteId,
    customerId,
    actorId: ctx.userId,
    metadata: statusChanged ? { from: currentStatus, to: nextStatus } : {},
  });
  // Si la date d'envoi change, la relance programmée est recalculée
  if (sentAt !== current.sent_at) {
    await db.from("followup_jobs").update({ status: "cancelled", cancelled_reason: "replanifiee" }).eq("quote_id", quoteId).eq("status", "scheduled");
  }
  await syncQuoteFollowups(db, quoteId, { actorId: ctx.userId });
}

function statusEventType(status: QuoteStatus) {
  if (status === "accepted") return "quote_accepted" as const;
  if (status === "declined") return "quote_declined" as const;
  return "quote_status_changed" as const;
}

/** Changement de statut rapide (sans formulaire complet). */
export async function changeQuoteStatus(
  db: Db,
  ctx: Ctx,
  quoteId: string,
  to: QuoteStatus,
  extra: { lostReason?: LostReason | null; lostReasonDetails?: string | null; sentOn?: string | null } = {},
) {
  const { data: q } = await db.from("quotes").select("id, status, reference, customer_id, sent_at, issued_on").eq("id", quoteId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!q) throw new ActionError("Devis introuvable.");
  const from = q.status as QuoteStatus;
  if (from === to) return;
  if (to === "to_follow_up" || to === "followed_up") throw new ActionError("Ce statut est géré automatiquement.");
  if (!canTransition(from, to)) {
    throw new ActionError(`Passage de « ${QUOTE_STATUS_LABELS[from]} » à « ${QUOTE_STATUS_LABELS[to]} » impossible.`);
  }
  const update: TablesUpdate<"quotes"> = { status: to };
  if (to === "sent" && !q.sent_at) update.sent_at = sentAtFromDate(extra.sentOn ?? todayParis());
  if (to === "draft") update.sent_at = null;
  if (to === "declined" || to === "cancelled") {
    update.lost_reason = extra.lostReason ?? null;
    update.lost_reason_details = extra.lostReasonDetails ?? null;
  }
  if (to === "sent" || to === "pending") {
    update.followups_paused = false;
    update.followups_paused_reason = null;
  }
  const { error } = await db.from("quotes").update(update).eq("id", quoteId).eq("status", from);
  assertNoError(error, "Changement de statut");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: statusEventType(to),
    message: `Devis ${q.reference} : ${QUOTE_STATUS_LABELS[from]} → ${QUOTE_STATUS_LABELS[to]}`,
    quoteId,
    customerId: q.customer_id,
    actorId: ctx.userId,
    metadata: { from, to, lost_reason: extra.lostReason ?? null },
  });
  // Reprise des relances : un devis remis en « Envoyé » repart de son historique
  if (to === "sent" && (from === "pending" || from === "expired" || from === "accepted" || from === "declined")) {
    const { data: count } = await db.from("followup_jobs").select("id").eq("quote_id", quoteId).eq("status", "sent");
    if ((count ?? []).length > 0) await db.from("quotes").update({ status: "followed_up" }).eq("id", quoteId);
  }
  await syncQuoteFollowups(db, quoteId, { actorId: ctx.userId });
}

/** « Le client a répondu » : enregistre la réponse et suspend les relances (statut En attente). */
export async function recordReply(
  db: Db,
  ctx: Ctx,
  quoteId: string,
  input: { channel: "email" | "phone" | "other"; summary: string | null; occurredAt?: string },
) {
  const { data: q } = await db.from("quotes").select("id, status, reference, customer_id").eq("id", quoteId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!q) throw new ActionError("Devis introuvable.");
  const occurred = input.occurredAt ?? new Date().toISOString();
  const { error } = await db.from("communication_events").insert({
    organization_id: ctx.organizationId,
    quote_id: quoteId,
    customer_id: q.customer_id,
    direction: "inbound",
    channel: input.channel,
    kind: "reply",
    summary: input.summary,
    occurred_at: occurred,
    actor_id: ctx.userId,
  });
  assertNoError(error, "Enregistrement de la réponse");
  const stillOpen = ["sent", "to_follow_up", "followed_up"].includes(q.status);
  await db
    .from("quotes")
    .update({ replied_at: occurred, ...(stillOpen ? { status: "pending" } : {}) })
    .eq("id", quoteId);
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "reply_recorded",
    message: `Réponse du client enregistrée sur ${q.reference}${stillOpen ? " — relances suspendues" : ""}`,
    quoteId,
    customerId: q.customer_id,
    actorId: ctx.userId,
    metadata: { channel: input.channel },
  });
  await syncQuoteFollowups(db, quoteId, { actorId: ctx.userId });
}

export async function setFollowupsPaused(db: Db, ctx: Ctx, quoteId: string, paused: boolean, reason?: string | null) {
  const { data: q } = await db.from("quotes").select("id, reference, customer_id, customer:customers(do_not_contact)").eq("id", quoteId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!q) throw new ActionError("Devis introuvable.");
  if (!paused && q.customer?.do_not_contact) throw new ActionError("Le client s'est opposé à être recontacté : relances impossibles.");
  const { error } = await db
    .from("quotes")
    .update({ followups_paused: paused, followups_paused_reason: paused ? (reason ?? "suspendu") : null })
    .eq("id", quoteId);
  assertNoError(error, "Suspension des relances");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: paused ? "followups_paused" : "followups_resumed",
    message: paused ? `Relances suspendues sur ${q.reference}` : `Relances reprises sur ${q.reference}`,
    quoteId,
    customerId: q.customer_id,
    actorId: ctx.userId,
  });
  if (!paused) {
    // Les relances annulées par la suspension sont reprogrammées depuis la date de reprise
    await syncQuoteFollowups(db, quoteId, { actorId: ctx.userId });
  }
}

export async function duplicateQuote(db: Db, ctx: Ctx, quoteId: string) {
  const { data: q } = await db.from("quotes").select("*").eq("id", quoteId).eq("organization_id", ctx.organizationId).maybeSingle();
  if (!q) throw new ActionError("Devis introuvable.");
  let reference = `${q.reference}-COPIE`.slice(0, 60);
  for (let i = 2; i < 50; i++) {
    const { data: exists } = await db.from("quotes").select("id").eq("organization_id", ctx.organizationId).eq("reference", reference).maybeSingle();
    if (!exists) break;
    reference = `${q.reference}-COPIE-${i}`.slice(0, 60);
  }
  const { data: copy, error } = await db
    .from("quotes")
    .insert({
      organization_id: ctx.organizationId,
      customer_id: q.customer_id,
      reference,
      title: q.title,
      service_type: q.service_type,
      description: q.description,
      amount_ht_cents: q.amount_ht_cents,
      amount_ttc_cents: q.amount_ttc_cents,
      vat_rate_bp: q.vat_rate_bp,
      issued_on: todayParis(),
      status: "draft",
      owner_id: ctx.userId,
      notes: q.notes,
      source: "duplicate",
      created_by: ctx.userId,
    })
    .select("id, reference")
    .single();
  assertNoError(error, "Duplication du devis");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "quote_duplicated",
    message: `Devis ${copy!.reference} créé par duplication de ${q.reference}`,
    quoteId: copy!.id,
    customerId: q.customer_id,
    actorId: ctx.userId,
    metadata: { source_quote_id: q.id },
  });
  return copy!;
}
