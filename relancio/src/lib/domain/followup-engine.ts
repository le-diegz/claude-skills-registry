import { TZDate } from "@date-fns/tz";
import { APP_TIMEZONE, FOLLOWUP_ACTIVE_STATUSES, type QuoteStatus, type TemplateKind } from "./constants";
import { addBusinessDays, addCalendarDays, isBusinessDay, type CalendarDay } from "./business-days";

export interface FollowupPolicy {
  first_delay_days: number;
  second_delay_days: number;
  third_delay_days: number | null;
  max_followups: number;
  business_days_only: boolean;
  window_start_minutes: number;
  window_end_minutes: number;
}

export const DEFAULT_POLICY: FollowupPolicy = {
  first_delay_days: 3,
  second_delay_days: 7,
  third_delay_days: 14,
  max_followups: 3,
  business_days_only: true,
  window_start_minutes: 9 * 60,
  window_end_minutes: 18 * 60,
};

/** Nombre maximal effectif de relances (la 3e n'existe que si son délai est défini). */
export function effectiveMaxFollowups(policy: FollowupPolicy): number {
  const max = Math.min(Math.max(policy.max_followups, 1), 3);
  if (max === 3 && policy.third_delay_days === null) return 2;
  return max;
}

/** Délai (en jours) avant la relance n°sequence, ou null si cette relance n'existe pas. */
export function delayForSequence(policy: FollowupPolicy, sequence: number): number | null {
  if (sequence < 1 || sequence > effectiveMaxFollowups(policy)) return null;
  if (sequence === 1) return policy.first_delay_days;
  if (sequence === 2) return policy.second_delay_days;
  return policy.third_delay_days;
}

function toCalendarDay(instant: Date): CalendarDay {
  const p = new TZDate(instant.getTime(), APP_TIMEZONE);
  return { year: p.getFullYear(), month: p.getMonth() + 1, day: p.getDate() };
}

function atParisMinutes(d: CalendarDay, minutes: number): Date {
  return new Date(
    new TZDate(d.year, d.month - 1, d.day, Math.floor(minutes / 60), minutes % 60, 0, APP_TIMEZONE).getTime(),
  );
}

function parisMinutesOf(instant: Date): number {
  const p = new TZDate(instant.getTime(), APP_TIMEZONE);
  return p.getHours() * 60 + p.getMinutes();
}

/**
 * Date de la relance n°sequence.
 * - sequence 1 : comptée depuis la date d'envoi du devis
 * - sequence 2/3 : comptée depuis la relance précédente
 * Le résultat est positionné au début de la fenêtre horaire autorisée, un jour autorisé.
 */
export function computeFollowupDate(policy: FollowupPolicy, referenceDate: Date, sequence: number): Date | null {
  const delay = delayForSequence(policy, sequence);
  if (delay === null) return null;
  const start = toCalendarDay(referenceDate);
  const target = policy.business_days_only ? addBusinessDays(start, delay) : addCalendarDays(start, delay);
  return atParisMinutes(target, policy.window_start_minutes);
}

/** Vrai si l'instant est dans la fenêtre d'envoi autorisée (jour + horaires). */
export function isWithinSendWindow(policy: FollowupPolicy, instant: Date): boolean {
  const day = toCalendarDay(instant);
  if (policy.business_days_only && !isBusinessDay(day)) return false;
  const minutes = parisMinutesOf(instant);
  return minutes >= policy.window_start_minutes && minutes < policy.window_end_minutes;
}

/** Prochain instant d'envoi autorisé à partir de `instant` (lui-même s'il est dans la fenêtre). */
export function nextSendWindowStart(policy: FollowupPolicy, instant: Date): Date {
  if (isWithinSendWindow(policy, instant)) return instant;
  let day = toCalendarDay(instant);
  const minutes = parisMinutesOf(instant);
  const dayAllowed = !policy.business_days_only || isBusinessDay(day);
  if (dayAllowed && minutes < policy.window_start_minutes) {
    return atParisMinutes(day, policy.window_start_minutes);
  }
  do {
    day = addCalendarDays(day, 1);
  } while (policy.business_days_only && !isBusinessDay(day));
  return atParisMinutes(day, policy.window_start_minutes);
}

/** Modèle à utiliser selon le rang de la relance. */
export function templateKindForSequence(sequence: number, max: number): TemplateKind {
  if (sequence >= max && max > 1) return "last";
  if (sequence === 1) return "first";
  return "second";
}

export interface FollowupEligibilityInput {
  status: QuoteStatus;
  followups_paused: boolean;
  followup_count: number;
  customer_do_not_contact: boolean;
  sent_at: string | null;
}

export type IneligibilityReason =
  | "not_sent"
  | "closed"
  | "awaiting_decision"
  | "paused"
  | "do_not_contact"
  | "max_reached";

/** Indique si un devis peut encore faire l'objet d'une relance. */
export function followupEligibility(
  quote: FollowupEligibilityInput,
  policy: FollowupPolicy,
): { eligible: true } | { eligible: false; reason: IneligibilityReason } {
  if (quote.status === "draft" || !quote.sent_at) return { eligible: false, reason: "not_sent" };
  if (quote.status === "pending") return { eligible: false, reason: "awaiting_decision" };
  if (!FOLLOWUP_ACTIVE_STATUSES.includes(quote.status)) return { eligible: false, reason: "closed" };
  if (quote.customer_do_not_contact) return { eligible: false, reason: "do_not_contact" };
  if (quote.followups_paused) return { eligible: false, reason: "paused" };
  if (quote.followup_count >= effectiveMaxFollowups(policy)) return { eligible: false, reason: "max_reached" };
  return { eligible: true };
}

export const INELIGIBILITY_LABELS: Record<IneligibilityReason, string> = {
  not_sent: "Le devis n'a pas encore été envoyé",
  closed: "Le devis est clôturé",
  awaiting_decision: "Le client a répondu : relances suspendues",
  paused: "Relances suspendues pour ce devis",
  do_not_contact: "Le client ne souhaite plus être recontacté",
  max_reached: "Nombre maximal de relances atteint",
};

/**
 * Planifie la prochaine relance d'un devis.
 * Retourne { sequence, scheduledFor } ou null si aucune relance ne doit être programmée.
 */
export function planNextFollowup(
  quote: FollowupEligibilityInput & { last_followup_at: string | null },
  policy: FollowupPolicy,
): { sequence: number; scheduledFor: Date } | null {
  const elig = followupEligibility(quote, policy);
  if (!elig.eligible) return null;
  const sequence = quote.followup_count + 1;
  const reference = sequence === 1 || !quote.last_followup_at ? quote.sent_at! : quote.last_followup_at;
  const scheduledFor = computeFollowupDate(policy, new Date(reference), sequence);
  if (!scheduledFor) return null;
  return { sequence, scheduledFor };
}

export function formatWindow(policy: Pick<FollowupPolicy, "window_start_minutes" | "window_end_minutes">): string {
  const f = (m: number) => `${Math.floor(m / 60)}h${m % 60 === 0 ? "" : String(m % 60).padStart(2, "0")}`;
  return `${f(policy.window_start_minutes)} – ${f(policy.window_end_minutes)}`;
}
