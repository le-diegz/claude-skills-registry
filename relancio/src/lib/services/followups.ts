import "server-only";
import type { Db, FollowupJobRow, PolicyRow, TemplateRow } from "@/lib/db";
import {
  DEFAULT_POLICY,
  effectiveMaxFollowups,
  isWithinSendWindow,
  nextSendWindowStart,
  planNextFollowup,
  templateKindForSequence,
  type FollowupPolicy,
} from "@/lib/domain/followup-engine";
import { OPEN_JOB_STATUSES, type QuoteStatus, type TemplateKind } from "@/lib/domain/constants";
import { buildTemplateValues, renderTemplate } from "@/lib/domain/templates";
import { parisDayKey, todayParis } from "@/lib/domain/dates";
import { ActionError, assertNoError } from "@/lib/actions";
import { logActivity } from "./activity";
import { notifyMembers } from "./notifications";
import { sendEmail } from "./email";
import { isEmailProviderConfigured } from "@/lib/env";

export function toPolicy(row: PolicyRow | null): FollowupPolicy {
  if (!row) return DEFAULT_POLICY;
  return {
    first_delay_days: row.first_delay_days,
    second_delay_days: row.second_delay_days,
    third_delay_days: row.third_delay_days,
    max_followups: row.max_followups,
    business_days_only: row.business_days_only,
    window_start_minutes: row.window_start_minutes,
    window_end_minutes: row.window_end_minutes,
  };
}

export async function loadPolicy(db: Db, organizationId: string): Promise<{ policy: FollowupPolicy; autoExpire: boolean }> {
  const { data } = await db.from("followup_policies").select("*").eq("organization_id", organizationId).maybeSingle();
  return { policy: toPolicy(data), autoExpire: data?.auto_expire ?? true };
}

const OPEN_JOBS = OPEN_JOB_STATUSES as unknown as string[];

/** Étapes consommées (relances envoyées ou ignorées) et date de la dernière. */
async function consumedSteps(db: Db, quoteId: string) {
  const { data } = await db
    .from("followup_jobs")
    .select("sequence, status, sent_at, updated_at")
    .eq("quote_id", quoteId)
    .in("status", ["sent", "skipped"]);
  const rows = data ?? [];
  const last = rows
    .map((r) => (r.status === "sent" ? r.sent_at : r.updated_at))
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);
  return { count: rows.reduce((m, r) => Math.max(m, r.sequence), 0), last: last ?? null };
}

/**
 * Synchronise les relances d'un devis avec son état : programme la prochaine relance si le devis
 * est éligible, annule les relances ouvertes sinon, et met à jour `next_followup_at`.
 * Idempotent : peut être appelé après toute modification.
 */
export async function syncQuoteFollowups(db: Db, quoteId: string, opts: { actorId?: string | null } = {}) {
  const { data: quote, error } = await db
    .from("quotes")
    .select("id, organization_id, status, sent_at, followups_paused, followup_count, last_followup_at, next_followup_at, reference, customer:customers(do_not_contact)")
    .eq("id", quoteId)
    .single();
  assertNoError(error, "Lecture du devis");
  if (!quote) return null;
  const { policy } = await loadPolicy(db, quote.organization_id);
  const steps = await consumedSteps(db, quoteId);

  const plan = planNextFollowup(
    {
      status: quote.status as QuoteStatus,
      followups_paused: quote.followups_paused,
      followup_count: steps.count,
      customer_do_not_contact: quote.customer?.do_not_contact ?? false,
      sent_at: quote.sent_at,
      last_followup_at: steps.last,
    },
    policy,
  );

  const { data: openJobs } = await db.from("followup_jobs").select("*").eq("quote_id", quoteId).in("status", OPEN_JOBS);

  if (!plan) {
    if ((openJobs ?? []).length > 0) {
      await db
        .from("followup_jobs")
        .update({ status: "cancelled", cancelled_reason: "non_eligible" })
        .eq("quote_id", quoteId)
        .in("status", OPEN_JOBS);
    }
    if (quote.next_followup_at) await db.from("quotes").update({ next_followup_at: null }).eq("id", quoteId);
    if (quote.status === "to_follow_up") {
      await db.from("quotes").update({ status: steps.count > 0 ? "followed_up" : "sent" }).eq("id", quoteId);
    }
    return null;
  }

  // Annule les relances ouvertes d'une autre séquence (ex. politique modifiée)
  const stale = (openJobs ?? []).filter((j) => j.sequence !== plan.sequence);
  if (stale.length > 0) {
    await db.from("followup_jobs").update({ status: "cancelled", cancelled_reason: "replanifiee" }).in("id", stale.map((j) => j.id));
  }

  const { data: existing } = await db
    .from("followup_jobs")
    .select("*")
    .eq("quote_id", quoteId)
    .eq("sequence", plan.sequence)
    .maybeSingle();

  let job: FollowupJobRow | null = existing;
  if (!existing) {
    const { data: inserted, error: insErr } = await db
      .from("followup_jobs")
      .insert({
        organization_id: quote.organization_id,
        quote_id: quoteId,
        sequence: plan.sequence,
        status: "scheduled",
        scheduled_for: plan.scheduledFor.toISOString(),
      })
      .select("*")
      .single();
    if (insErr?.code === "23505") {
      // Course concurrente : une autre requête a créé la relance
      const { data } = await db.from("followup_jobs").select("*").eq("quote_id", quoteId).eq("sequence", plan.sequence).single();
      job = data;
    } else {
      assertNoError(insErr, "Programmation de la relance");
      job = inserted;
      await logActivity(db, {
        organizationId: quote.organization_id,
        type: "followup_scheduled",
        message: `Relance n°${plan.sequence} programmée`,
        quoteId,
        actorId: opts.actorId ?? null,
        metadata: { scheduled_for: plan.scheduledFor.toISOString(), sequence: plan.sequence },
      });
    }
  } else if (existing.status === "cancelled") {
    const { data: reopened, error: upErr } = await db
      .from("followup_jobs")
      .update({
        status: "scheduled",
        scheduled_for: plan.scheduledFor.toISOString(),
        subject: null,
        body: null,
        approved_at: null,
        approved_by: null,
        cancelled_reason: null,
        last_error: null,
      })
      .eq("id", existing.id)
      .eq("status", "cancelled")
      .select("*")
      .single();
    assertNoError(upErr, "Reprogrammation de la relance");
    job = reopened;
  }

  if (job && OPEN_JOBS.includes(job.status) && quote.next_followup_at !== job.scheduled_for) {
    await db.from("quotes").update({ next_followup_at: job.scheduled_for }).eq("id", quoteId);
  }
  return job;
}

interface PrepareOptions {
  organizationId?: string;
  now?: Date;
  limit?: number;
}

/**
 * Prépare les relances échues : génère le message depuis le modèle et les place
 * « En attente de validation » (ou « À préparer » si le client n'a pas d'email).
 * Idempotent grâce à la transition conditionnelle scheduled → pending_approval.
 * Aucun envoi n'est effectué ici.
 */
export async function prepareDueFollowups(db: Db, options: PrepareOptions = {}) {
  const now = options.now ?? new Date();
  let query = db
    .from("followup_jobs")
    .select(
      "id, organization_id, quote_id, sequence, scheduled_for, quote:quotes(id, status, reference, title, amount_ttc_cents, sent_at, issued_on, expires_on, followups_paused, customer:customers(name, company_name, email, do_not_contact)), organization:organizations(name)",
    )
    .eq("status", "scheduled")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for")
    .limit(options.limit ?? 500);
  if (options.organizationId) query = query.eq("organization_id", options.organizationId);
  const { data: jobs, error } = await query;
  assertNoError(error, "Lecture des relances échues");

  const templatesByOrg = new Map<string, TemplateRow[]>();
  const policyByOrg = new Map<string, FollowupPolicy>();
  const preparedByOrg = new Map<string, number>();

  for (const job of jobs ?? []) {
    const quote = job.quote;
    if (!quote || !quote.customer) continue;
    if (!["sent", "to_follow_up", "followed_up"].includes(quote.status) || quote.followups_paused || quote.customer.do_not_contact) {
      await db.from("followup_jobs").update({ status: "cancelled", cancelled_reason: "non_eligible" }).eq("id", job.id).eq("status", "scheduled");
      continue;
    }
    if (!templatesByOrg.has(job.organization_id)) {
      const { data } = await db.from("followup_templates").select("*").eq("organization_id", job.organization_id).eq("is_active", true);
      templatesByOrg.set(job.organization_id, data ?? []);
      policyByOrg.set(job.organization_id, (await loadPolicy(db, job.organization_id)).policy);
    }
    const policy = policyByOrg.get(job.organization_id)!;
    const kind: TemplateKind = templateKindForSequence(job.sequence, effectiveMaxFollowups(policy));
    const templates = templatesByOrg.get(job.organization_id)!;
    const template = templates.find((t) => t.kind === kind) ?? templates.find((t) => t.kind === "first") ?? null;
    const values = buildTemplateValues({
      customer: quote.customer,
      organization: { name: job.organization?.name ?? "" },
      quote,
    });
    const email = quote.customer.email;
    const { data: updated } = await db
      .from("followup_jobs")
      .update({
        status: email ? "pending_approval" : "to_prepare",
        template_id: template?.id ?? null,
        subject: template ? renderTemplate(template.subject, values) : `Votre devis ${quote.reference}`,
        body: template ? renderTemplate(template.body, values) : "",
        recipient_email: email,
        channel: email ? "email" : "phone",
      })
      .eq("id", job.id)
      .eq("status", "scheduled")
      .select("id");
    if (!updated || updated.length === 0) continue; // déjà préparée ailleurs

    if (quote.status === "sent" || quote.status === "followed_up") {
      await db.from("quotes").update({ status: "to_follow_up" }).eq("id", quote.id).in("status", ["sent", "followed_up"]);
    }
    await logActivity(db, {
      organizationId: job.organization_id,
      type: "followup_prepared",
      message: email
        ? `Relance n°${job.sequence} prête : en attente de validation`
        : `Relance n°${job.sequence} à préparer (client sans email)`,
      quoteId: quote.id,
    });
    preparedByOrg.set(job.organization_id, (preparedByOrg.get(job.organization_id) ?? 0) + 1);
  }

  for (const [orgId, count] of preparedByOrg) {
    await notifyMembers(db, {
      organizationId: orgId,
      type: "followup_to_approve",
      title: count > 1 ? `${count} relances à valider` : "1 relance à valider",
      body: "Vérifiez et validez les messages avant envoi.",
      link: "/relances",
      dedupeKey: `followups:${orgId}:${parisDayKey(now)}:${count}`,
    });
  }
  return { prepared: [...preparedByOrg.values()].reduce((a, b) => a + b, 0) };
}

/** Passe en « Expiré » les devis ouverts dont la date de validité est dépassée (si la politique le prévoit). */
export async function expireOverdueQuotes(db: Db, options: { organizationId?: string; now?: Date } = {}) {
  const today = todayParis(options.now);
  let query = db
    .from("quotes")
    .select("id, organization_id, reference")
    .in("status", ["sent", "to_follow_up", "followed_up"])
    .lt("expires_on", today)
    .limit(500);
  if (options.organizationId) query = query.eq("organization_id", options.organizationId);
  const { data } = await query;
  let expired = 0;
  const policyCache = new Map<string, boolean>();
  for (const q of data ?? []) {
    if (!policyCache.has(q.organization_id)) policyCache.set(q.organization_id, (await loadPolicy(db, q.organization_id)).autoExpire);
    if (!policyCache.get(q.organization_id)) continue;
    const { data: upd } = await db
      .from("quotes")
      .update({ status: "expired" })
      .eq("id", q.id)
      .in("status", ["sent", "to_follow_up", "followed_up"])
      .select("id");
    if (upd && upd.length > 0) {
      expired++;
      await logActivity(db, {
        organizationId: q.organization_id,
        type: "quote_status_changed",
        message: `Devis ${q.reference} expiré (date de validité dépassée)`,
        quoteId: q.id,
        metadata: { to: "expired", automatic: true },
      });
    }
  }
  return { expired };
}

// ---------------------------------------------------------------------------
// Actions sur une relance
// ---------------------------------------------------------------------------

async function loadJob(db: Db, jobId: string, organizationId: string) {
  const { data, error } = await db
    .from("followup_jobs")
    .select("*, quote:quotes(id, status, reference, organization_id, followup_count, customer:customers(id, name, email, do_not_contact))")
    .eq("id", jobId)
    .eq("organization_id", organizationId)
    .single();
  if (error || !data) throw new ActionError("Relance introuvable.");
  return data;
}

const EDITABLE = ["pending_approval", "to_prepare", "approved", "failed"];

export async function updateJobContent(
  db: Db,
  ctx: { organizationId: string; userId: string },
  jobId: string,
  content: { subject: string; body: string; recipientEmail: string | null },
) {
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (!EDITABLE.includes(job.status)) throw new ActionError("Cette relance ne peut plus être modifiée.");
  // Toute modification annule une validation précédente : le message doit être revalidé.
  const { error } = await db
    .from("followup_jobs")
    .update({
      subject: content.subject,
      body: content.body,
      recipient_email: content.recipientEmail,
      status: content.recipientEmail ? "pending_approval" : "to_prepare",
      channel: content.recipientEmail ? "email" : "phone",
      approved_at: null,
      approved_by: null,
    })
    .eq("id", jobId)
    .in("status", EDITABLE);
  assertNoError(error, "Mise à jour de la relance");
}

/** Validation humaine explicite (obligatoire avant tout envoi). */
export async function approveJob(
  db: Db,
  ctx: { organizationId: string; userId: string },
  jobId: string,
  content?: { subject: string; body: string; recipientEmail: string | null },
) {
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (!["pending_approval", "to_prepare", "failed", "approved"].includes(job.status)) {
    throw new ActionError("Cette relance ne peut pas être validée dans son état actuel.");
  }
  const subject = content?.subject ?? job.subject;
  const body = content?.body ?? job.body;
  if (!subject?.trim() || !body?.trim()) throw new ActionError("Le message est vide : complétez-le avant de le valider.");
  const { data, error } = await db
    .from("followup_jobs")
    .update({
      subject,
      body,
      recipient_email: content ? content.recipientEmail : job.recipient_email,
      status: "approved",
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", jobId)
    .in("status", ["pending_approval", "to_prepare", "failed", "approved"])
    .select("id");
  assertNoError(error, "Validation de la relance");
  if (!data || data.length === 0) throw new ActionError("La relance a été modifiée entre-temps. Rechargez la page.");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "followup_approved",
    message: `Relance n°${job.sequence} validée`,
    quoteId: job.quote_id,
    actorId: ctx.userId,
  });
}

/** Enregistre les effets d'une relance envoyée (email ou manuel) sur le devis. */
async function afterFollowupSent(
  db: Db,
  ctx: { organizationId: string; userId: string | null },
  job: { id: string; quote_id: string; sequence: number; subject: string | null },
  details: { channel: "email" | "manual" | "phone"; providerMessageId?: string; sentAt: string; note?: string | null },
) {
  const { data: quote } = await db.from("quotes").select("followup_count, status, customer_id").eq("id", job.quote_id).single();
  await db
    .from("quotes")
    .update({
      followup_count: (quote?.followup_count ?? 0) + 1,
      last_followup_at: details.sentAt,
      status: quote && ["sent", "to_follow_up", "followed_up"].includes(quote.status) ? "followed_up" : quote?.status,
      next_followup_at: null,
    })
    .eq("id", job.quote_id);
  await db.from("communication_events").insert({
    organization_id: ctx.organizationId,
    quote_id: job.quote_id,
    customer_id: quote?.customer_id ?? null,
    followup_job_id: job.id,
    direction: "outbound",
    channel: details.channel === "email" ? "email" : details.channel === "phone" ? "phone" : "manual",
    kind: details.channel === "email" ? "followup_sent" : "followup_manual",
    delivery_status: details.channel === "email" ? "sent" : null,
    provider: details.channel === "email" ? "resend" : null,
    provider_message_id: details.providerMessageId ?? null,
    subject: job.subject,
    summary: details.note ?? null,
    occurred_at: details.sentAt,
    actor_id: ctx.userId,
  });
  const label =
    details.channel === "email"
      ? `Relance n°${job.sequence} envoyée par email`
      : details.channel === "phone"
        ? `Relance n°${job.sequence} effectuée par téléphone`
        : `Relance n°${job.sequence} marquée comme envoyée manuellement`;
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "followup_sent",
    message: label,
    quoteId: job.quote_id,
    actorId: ctx.userId,
    metadata: { channel: details.channel, sequence: job.sequence },
  });
  await syncQuoteFollowups(db, job.quote_id, { actorId: ctx.userId });
}

/**
 * Marque une relance comme effectuée hors plateforme (email copié, appel…).
 * L'action humaine vaut validation. Copier un message ne déclenche jamais cette fonction.
 */
export async function markJobSentManually(
  db: Db,
  ctx: { organizationId: string; userId: string },
  jobId: string,
  input: { channel: "manual" | "phone"; note?: string | null; subject?: string; body?: string },
) {
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (!["pending_approval", "to_prepare", "approved", "failed", "scheduled"].includes(job.status)) {
    throw new ActionError("Cette relance n'est plus active.");
  }
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("followup_jobs")
    .update({
      status: "sent",
      channel: input.channel,
      subject: input.subject ?? job.subject,
      body: input.body ?? job.body,
      approved_by: job.approved_by ?? ctx.userId,
      approved_at: job.approved_at ?? now,
      sent_at: now,
      sent_by: ctx.userId,
      last_error: null,
    })
    .eq("id", jobId)
    .in("status", ["pending_approval", "to_prepare", "approved", "failed", "scheduled"])
    .select("id, quote_id, sequence, subject");
  assertNoError(error, "Enregistrement de la relance");
  if (!data || data.length === 0) throw new ActionError("Cette relance a déjà été traitée.");
  await afterFollowupSent(db, ctx, data[0], { channel: input.channel, sentAt: now, note: input.note });
}

export type SendJobOutcome =
  | { status: "sent" }
  | { status: "queued"; scheduledFor: string }
  | { status: "failed"; error: string };

/**
 * Envoie une relance VALIDÉE via le fournisseur email.
 * - refuse toute relance non validée (contrainte SQL en plus)
 * - hors fenêtre horaire : la relance reste validée et sera envoyée à l'ouverture de la fenêtre
 * - transition atomique approved → sending : impossible d'envoyer deux fois
 * - clé d'idempotence fournisseur = identifiant de la relance
 */
export async function sendApprovedJob(
  db: Db,
  ctx: { organizationId: string; userId: string | null; isDemo: boolean; fromName: string; replyTo: string | null },
  jobId: string,
  options: { now?: Date; respectWindow?: boolean } = {},
): Promise<SendJobOutcome> {
  if (ctx.isDemo) throw new ActionError("Envoi réel interdit en mode démonstration. Utilisez « Marquer comme envoyé ».");
  if (!isEmailProviderConfigured()) throw new ActionError("L'envoi d'emails n'est pas configuré. Utilisez le mode manuel.");
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (job.status !== "approved" || !job.approved_by) throw new ActionError("La relance doit être validée avant l'envoi.");
  if (!job.recipient_email) throw new ActionError("Aucune adresse email destinataire.");
  if (job.quote?.customer?.do_not_contact) throw new ActionError("Le client s'est opposé à être recontacté.");

  const now = options.now ?? new Date();
  if (options.respectWindow !== false) {
    const { policy } = await loadPolicy(db, ctx.organizationId);
    if (!isWithinSendWindow(policy, now)) {
      const next = nextSendWindowStart(policy, now).toISOString();
      await db.from("followup_jobs").update({ scheduled_for: next }).eq("id", jobId).eq("status", "approved");
      return { status: "queued", scheduledFor: next };
    }
  }

  // Verrou optimiste : une seule requête peut passer en « sending »
  const { data: locked, error: lockErr } = await db
    .from("followup_jobs")
    .update({ status: "sending", attempt_count: job.attempt_count + 1 })
    .eq("id", jobId)
    .eq("status", "approved")
    .select("id, quote_id, sequence, subject, body, recipient_email");
  assertNoError(lockErr, "Verrouillage de l'envoi");
  if (!locked || locked.length === 0) throw new ActionError("Cette relance est déjà en cours d'envoi ou envoyée.");
  const l = locked[0];

  const result = await sendEmail({
    to: l.recipient_email!,
    subject: l.subject ?? "",
    text: l.body ?? "",
    fromName: ctx.fromName,
    replyTo: ctx.replyTo,
    idempotencyKey: `followup-${l.id}`,
  });

  if (!result.ok) {
    await db
      .from("followup_jobs")
      .update({ status: "failed", last_error: result.error.slice(0, 500) })
      .eq("id", jobId)
      .eq("status", "sending");
    await logActivity(db, {
      organizationId: ctx.organizationId,
      type: "followup_failed",
      message: `Échec d'envoi de la relance n°${l.sequence} : ${result.error.slice(0, 160)}`,
      quoteId: l.quote_id,
      actorId: ctx.userId,
    });
    await notifyMembers(db, {
      organizationId: ctx.organizationId,
      type: "send_failed",
      title: `Échec d'envoi — devis ${job.quote?.reference ?? ""}`,
      body: result.error.slice(0, 200),
      link: `/relances?onglet=erreurs`,
      dedupeKey: `send_failed:${l.id}:${job.attempt_count + 1}`,
    });
    return { status: "failed", error: result.error };
  }

  const sentAt = new Date().toISOString();
  await db
    .from("followup_jobs")
    .update({ status: "sent", sent_at: sentAt, sent_by: ctx.userId, provider_message_id: result.providerMessageId, last_error: null })
    .eq("id", jobId)
    .eq("status", "sending");
  await afterFollowupSent(db, ctx, l, { channel: "email", providerMessageId: result.providerMessageId, sentAt });
  return { status: "sent" };
}

/** Reporte une relance à une date donnée (au début de la fenêtre horaire). */
export async function snoozeJob(db: Db, ctx: { organizationId: string; userId: string }, jobId: string, until: Date) {
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (!OPEN_JOBS.includes(job.status)) throw new ActionError("Cette relance n'est plus active.");
  if (until.getTime() <= Date.now()) throw new ActionError("Choisissez une date future.");
  const { policy } = await loadPolicy(db, ctx.organizationId);
  const scheduled = nextSendWindowStart(policy, until);
  const { error } = await db
    .from("followup_jobs")
    .update({ status: "scheduled", scheduled_for: scheduled.toISOString(), approved_at: null, approved_by: null, subject: null, body: null, last_error: null })
    .eq("id", jobId)
    .in("status", OPEN_JOBS);
  assertNoError(error, "Report de la relance");
  const restore = (job.quote?.followup_count ?? 0) > 0 ? "followed_up" : "sent";
  await db.from("quotes").update({ next_followup_at: scheduled.toISOString(), status: restore }).eq("id", job.quote_id).in("status", ["to_follow_up", "sent", "followed_up"]);
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "followup_snoozed",
    message: `Relance n°${job.sequence} reportée`,
    quoteId: job.quote_id,
    actorId: ctx.userId,
    metadata: { scheduled_for: scheduled.toISOString() },
  });
  return scheduled;
}

/** Ignore une relance : l'étape est consommée et la suivante est programmée. */
export async function skipJob(db: Db, ctx: { organizationId: string; userId: string }, jobId: string) {
  const job = await loadJob(db, jobId, ctx.organizationId);
  if (!OPEN_JOBS.includes(job.status)) throw new ActionError("Cette relance n'est plus active.");
  const { error } = await db.from("followup_jobs").update({ status: "skipped" }).eq("id", jobId).in("status", OPEN_JOBS);
  assertNoError(error, "Relance ignorée");
  const restore = (job.quote?.followup_count ?? 0) > 0 ? "followed_up" : "sent";
  await db.from("quotes").update({ status: restore, next_followup_at: null }).eq("id", job.quote_id).eq("status", "to_follow_up");
  await logActivity(db, {
    organizationId: ctx.organizationId,
    type: "followup_skipped",
    message: `Relance n°${job.sequence} ignorée`,
    quoteId: job.quote_id,
    actorId: ctx.userId,
  });
  await syncQuoteFollowups(db, job.quote_id, { actorId: ctx.userId });
}

/** Envoie les relances validées dont l'heure d'envoi est arrivée (cron). */
export async function sendQueuedApprovedJobs(db: Db, now: Date = new Date()) {
  if (!isEmailProviderConfigured()) return { sent: 0, failed: 0 };
  const { data: jobs } = await db
    .from("followup_jobs")
    .select("id, organization_id, channel, organization:organizations(name, is_demo)")
    .eq("status", "approved")
    .eq("channel", "email")
    .not("approved_by", "is", null)
    .not("recipient_email", "is", null)
    .lte("scheduled_for", now.toISOString())
    .limit(100);
  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    if (!job.organization || job.organization.is_demo) continue;
    const { data: integ } = await db.from("integrations").select("*").eq("organization_id", job.organization_id).eq("provider", "resend").maybeSingle();
    if (!integ?.enabled) continue;
    try {
      const res = await sendApprovedJob(
        db,
        {
          organizationId: job.organization_id,
          userId: null,
          isDemo: false,
          fromName: integ.from_name || job.organization.name,
          replyTo: integ.verified_at ? integ.reply_to_email : null,
        },
        job.id,
        { now },
      );
      if (res.status === "sent") sent++;
      if (res.status === "failed") failed++;
    } catch (e) {
      console.error("[cron:send]", job.id, e);
    }
  }
  return { sent, failed };
}
