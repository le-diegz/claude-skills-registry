import "server-only";
import type { Db } from "@/lib/db";

type NotificationType = "followup_to_approve" | "quote_to_follow" | "import_completed" | "send_failed" | "invitation" | "info";

const PREF_COLUMN: Partial<Record<NotificationType, "notify_followups" | "notify_imports" | "notify_failures">> = {
  followup_to_approve: "notify_followups",
  quote_to_follow: "notify_followups",
  import_completed: "notify_imports",
  send_failed: "notify_failures",
};

/** Notifie les membres d'une organisation (en respectant leurs préférences). */
export async function notifyMembers(
  db: Db,
  input: {
    organizationId: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    dedupeKey?: string;
    userIds?: string[];
  },
): Promise<void> {
  let userIds = input.userIds;
  if (!userIds) {
    const { data } = await db.from("organization_members").select("user_id").eq("organization_id", input.organizationId);
    userIds = (data ?? []).map((m) => m.user_id);
  }
  if (userIds.length === 0) return;
  const pref = PREF_COLUMN[input.type];
  if (pref) {
    const { data: profiles } = await db.from("profiles").select(`id, ${pref}`).in("id", userIds);
    if (profiles) {
      const allowed = new Set(
        (profiles as unknown as Record<string, unknown>[]).filter((p) => p[pref] !== false).map((p) => p.id as string),
      );
      // Les profils illisibles (RLS) sont conservés par défaut
      userIds = userIds.filter((id) => allowed.has(id) || !profiles.some((p) => (p as { id: string }).id === id));
    }
  }
  const rows = userIds.map((user_id) => ({
    organization_id: input.organizationId,
    user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    dedupe_key: input.dedupeKey ? `${input.dedupeKey}` : null,
  }));
  const { error } = await db.from("notifications").upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  if (error) console.error("[notifications]", error.message);
}
