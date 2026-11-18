import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CLOSED_STATUSES, OPEN_STATUSES, type QuoteStatus, type ServiceType, type LostReason } from "./constants";
import { endOfParisDay, startOfParisDay, toParis } from "./dates";

export interface StatsQuote {
  id: string;
  status: QuoteStatus;
  amount_ht_cents: number;
  issued_on: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  replied_at: string | null;
  owner_id: string | null;
  service_type: ServiceType;
  followup_count: number;
  last_followup_at: string | null;
  next_followup_at: string | null;
  lost_reason: LostReason | null;
  updated_at: string;
}

export interface StatsFollowup {
  quote_id: string;
  status: string;
  sent_at: string | null;
}

export interface StatsReply {
  quote_id: string | null;
  occurred_at: string;
}

export interface Period {
  from: Date;
  to: Date;
}

const inPeriod = (value: string | null, p: Period) => {
  if (!value) return false;
  const t = new Date(value).getTime();
  return t >= p.from.getTime() && t <= p.to.getTime();
};

/** Indicateurs instantanés (état actuel du portefeuille). */
export function computeSnapshot(quotes: StatsQuote[], now: Date = new Date()) {
  const open = quotes.filter((q) => OPEN_STATUSES.includes(q.status));
  const todayEnd = endOfParisDay(now).getTime();
  const todayStart = startOfParisDay(now).getTime();
  const due = open.filter(
    (q) => (q.status === "sent" || q.status === "followed_up" || q.status === "to_follow_up") && q.next_followup_at,
  );
  const dueToday = due.filter((q) => new Date(q.next_followup_at!).getTime() <= todayEnd);
  const overdue = due.filter((q) => new Date(q.next_followup_at!).getTime() < todayStart);
  return {
    openCount: open.length,
    openAmountCents: open.reduce((s, q) => s + q.amount_ht_cents, 0),
    dueTodayCount: dueToday.length,
    dueTodayAmountCents: dueToday.reduce((s, q) => s + q.amount_ht_cents, 0),
    overdueCount: overdue.length,
    pendingDecisionCount: open.filter((q) => q.status === "pending").length,
    draftCount: quotes.filter((q) => q.status === "draft").length,
  };
}

export interface PeriodStats {
  sentCount: number;
  acceptedCount: number;
  declinedCount: number;
  acceptedAmountCents: number;
  /** Taux d'acceptation sur les devis envoyés pendant la période et déjà tranchés. */
  acceptanceRate: number | null;
  decidedCount: number;
  followupsSent: number;
  quotesFollowedUp: number;
  repliesAfterFollowup: number;
  acceptedAfterFollowup: number;
  acceptedWithoutFollowup: number;
  /** Délai moyen (jours) entre l'envoi et la première réaction (réponse, acceptation ou refus). */
  avgResponseDays: number | null;
  responseSampleSize: number;
}

export function computePeriodStats(
  quotes: StatsQuote[],
  followups: StatsFollowup[],
  replies: StatsReply[],
  period: Period,
): PeriodStats {
  const sentInPeriod = quotes.filter((q) => inPeriod(q.sent_at, period));
  const acceptedInPeriod = quotes.filter((q) => q.status === "accepted" && inPeriod(q.accepted_at, period));
  const declinedInPeriod = quotes.filter((q) => q.status === "declined" && inPeriod(q.declined_at, period));
  const decided = sentInPeriod.filter((q) => q.status === "accepted" || q.status === "declined" || q.status === "expired");
  const acceptedCohort = decided.filter((q) => q.status === "accepted").length;

  const quoteIds = new Set(quotes.map((q) => q.id));
  const sentFollowups = followups.filter((f) => f.status === "sent" && quoteIds.has(f.quote_id) && inPeriod(f.sent_at, period));
  const firstFollowupByQuote = new Map<string, number>();
  for (const f of followups) {
    if (f.status !== "sent" || !f.sent_at || !quoteIds.has(f.quote_id)) continue;
    const t = new Date(f.sent_at).getTime();
    const prev = firstFollowupByQuote.get(f.quote_id);
    if (prev === undefined || t < prev) firstFollowupByQuote.set(f.quote_id, t);
  }

  const repliedQuotes = new Set<string>();
  for (const r of replies) {
    if (!r.quote_id || !inPeriod(r.occurred_at, period)) continue;
    const first = firstFollowupByQuote.get(r.quote_id);
    if (first !== undefined && new Date(r.occurred_at).getTime() >= first) repliedQuotes.add(r.quote_id);
  }

  const acceptedAfter = acceptedInPeriod.filter((q) => {
    const first = firstFollowupByQuote.get(q.id);
    return first !== undefined && q.accepted_at && new Date(q.accepted_at).getTime() >= first;
  });

  // Délai de réponse : première réaction connue après l'envoi
  const firstReplyByQuote = new Map<string, number>();
  for (const r of replies) {
    if (!r.quote_id) continue;
    const t = new Date(r.occurred_at).getTime();
    const prev = firstReplyByQuote.get(r.quote_id);
    if (prev === undefined || t < prev) firstReplyByQuote.set(r.quote_id, t);
  }
  const delays: number[] = [];
  for (const q of sentInPeriod) {
    const sent = new Date(q.sent_at!).getTime();
    const candidates = [firstReplyByQuote.get(q.id), q.accepted_at ? new Date(q.accepted_at).getTime() : undefined, q.declined_at ? new Date(q.declined_at).getTime() : undefined]
      .filter((v): v is number => v !== undefined && v >= sent);
    if (candidates.length > 0) delays.push((Math.min(...candidates) - sent) / 86_400_000);
  }

  return {
    sentCount: sentInPeriod.length,
    acceptedCount: acceptedInPeriod.length,
    declinedCount: declinedInPeriod.length,
    acceptedAmountCents: acceptedInPeriod.reduce((s, q) => s + q.amount_ht_cents, 0),
    acceptanceRate: decided.length > 0 ? acceptedCohort / decided.length : null,
    decidedCount: decided.length,
    followupsSent: sentFollowups.length,
    quotesFollowedUp: new Set(sentFollowups.map((f) => f.quote_id)).size,
    repliesAfterFollowup: repliedQuotes.size,
    acceptedAfterFollowup: acceptedAfter.length,
    acceptedWithoutFollowup: acceptedInPeriod.length - acceptedAfter.length,
    avgResponseDays: delays.length > 0 ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10 : null,
    responseSampleSize: delays.length,
  };
}

export interface MonthlyPoint {
  key: string;
  label: string;
  sent: number;
  accepted: number;
  acceptedAmountCents: number;
  followups: number;
}

/** Série mensuelle (fuseau Paris) sur les `months` derniers mois, mois courant inclus. */
export function computeMonthlySeries(
  quotes: StatsQuote[],
  followups: StatsFollowup[],
  months: number,
  now: Date = new Date(),
): MonthlyPoint[] {
  const p = toParis(now);
  const points: MonthlyPoint[] = [];
  const index = new Map<string, MonthlyPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(p.getFullYear(), p.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = { key, label: format(d, "MMM yy", { locale: fr }), sent: 0, accepted: 0, acceptedAmountCents: 0, followups: 0 };
    points.push(point);
    index.set(key, point);
  }
  const monthKey = (v: string) => format(toParis(v), "yyyy-MM");
  for (const q of quotes) {
    if (q.sent_at) {
      const pt = index.get(monthKey(q.sent_at));
      if (pt) pt.sent++;
    }
    if (q.status === "accepted" && q.accepted_at) {
      const pt = index.get(monthKey(q.accepted_at));
      if (pt) {
        pt.accepted++;
        pt.acceptedAmountCents += q.amount_ht_cents;
      }
    }
  }
  for (const f of followups) {
    if (f.status === "sent" && f.sent_at) {
      const pt = index.get(monthKey(f.sent_at));
      if (pt) pt.followups++;
    }
  }
  return points;
}

export function breakdownByService(quotes: StatsQuote[], period: Period) {
  const map = new Map<ServiceType, { service: ServiceType; sent: number; accepted: number; acceptedAmountCents: number }>();
  for (const q of quotes) {
    const entry = map.get(q.service_type) ?? { service: q.service_type, sent: 0, accepted: 0, acceptedAmountCents: 0 };
    if (inPeriod(q.sent_at, period)) entry.sent++;
    if (q.status === "accepted" && inPeriod(q.accepted_at, period)) {
      entry.accepted++;
      entry.acceptedAmountCents += q.amount_ht_cents;
    }
    map.set(q.service_type, entry);
  }
  return [...map.values()].filter((e) => e.sent > 0 || e.accepted > 0).sort((a, b) => b.sent - a.sent);
}

export function breakdownLostReasons(quotes: StatsQuote[], period: Period) {
  const map = new Map<string, number>();
  for (const q of quotes) {
    if (q.status !== "declined" || !inPeriod(q.declined_at, period)) continue;
    const k = q.lost_reason ?? "non_renseigne";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export function statusDistribution(quotes: StatsQuote[]) {
  const counts = new Map<QuoteStatus, { count: number; amountCents: number }>();
  for (const q of quotes) {
    const e = counts.get(q.status) ?? { count: 0, amountCents: 0 };
    e.count++;
    e.amountCents += q.amount_ht_cents;
    counts.set(q.status, e);
  }
  return counts;
}

export const isClosedStatus = (s: QuoteStatus) => CLOSED_STATUSES.includes(s);

export function periodFromPreset(preset: string, now: Date = new Date()): Period {
  const end = endOfParisDay(now);
  const p = toParis(now);
  const startOf = (y: number, m: number, d: number) => startOfParisDay(new Date(Date.UTC(y, m, d, 12)));
  switch (preset) {
    case "30j":
      return { from: startOfParisDay(new Date(now.getTime() - 29 * 86_400_000)), to: end };
    case "90j":
      return { from: startOfParisDay(new Date(now.getTime() - 89 * 86_400_000)), to: end };
    case "mois":
      return { from: startOf(p.getFullYear(), p.getMonth(), 1), to: end };
    case "annee":
      return { from: startOf(p.getFullYear(), 0, 1), to: end };
    case "12m":
      return { from: startOf(p.getFullYear(), p.getMonth() - 11, 1), to: end };
    default:
      return { from: startOfParisDay(new Date(now.getTime() - 89 * 86_400_000)), to: end };
  }
}

export const PERIOD_PRESETS = [
  { value: "30j", label: "30 derniers jours" },
  { value: "90j", label: "90 derniers jours" },
  { value: "mois", label: "Mois en cours" },
  { value: "annee", label: "Année en cours" },
  { value: "12m", label: "12 derniers mois" },
] as const;
