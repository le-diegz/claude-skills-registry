import "server-only";
import type { Db } from "@/lib/db";
import { syncQuoteFollowups } from "./followups";

/**
 * Recalcule les relances programmées d'une organisation (après changement de politique).
 * Les relances déjà préparées, validées ou envoyées ne sont pas modifiées.
 */
export async function resyncOrganizationFollowups(db: Db, organizationId: string, actorId: string | null): Promise<number> {
  await db
    .from("followup_jobs")
    .update({ status: "cancelled", cancelled_reason: "replanifiee" })
    .eq("organization_id", organizationId)
    .eq("status", "scheduled");
  const { data: quotes } = await db
    .from("quotes")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["sent", "to_follow_up", "followed_up"])
    .eq("followups_paused", false)
    .limit(2000);
  let n = 0;
  for (const q of quotes ?? []) {
    const job = await syncQuoteFollowups(db, q.id, { actorId });
    if (job) n++;
  }
  return n;
}
