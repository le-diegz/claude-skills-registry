import "server-only";
import type { Db } from "@/lib/db";
import type { StatsFollowup, StatsQuote, StatsReply } from "@/lib/domain/stats";

/** Charge les données nécessaires aux indicateurs (volume TPE/PME : quelques milliers de devis max.). */
export async function loadStatsData(db: Db, organizationId: string, filters: { ownerId?: string | null; serviceType?: string | null } = {}) {
  let q = db
    .from("quotes")
    .select("id, status, amount_ht_cents, issued_on, sent_at, accepted_at, declined_at, replied_at, owner_id, service_type, followup_count, last_followup_at, next_followup_at, lost_reason, updated_at")
    .eq("organization_id", organizationId)
    .limit(10000);
  if (filters.ownerId) q = q.eq("owner_id", filters.ownerId);
  if (filters.serviceType) q = q.eq("service_type", filters.serviceType);
  const [{ data: quotes }, { data: jobs }, { data: replies }] = await Promise.all([
    q,
    db.from("followup_jobs").select("quote_id, status, sent_at").eq("organization_id", organizationId).eq("status", "sent").limit(20000),
    db.from("communication_events").select("quote_id, occurred_at").eq("organization_id", organizationId).eq("kind", "reply").limit(20000),
  ]);
  return {
    quotes: (quotes ?? []) as StatsQuote[],
    followups: (jobs ?? []) as StatsFollowup[],
    replies: (replies ?? []) as StatsReply[],
  };
}
