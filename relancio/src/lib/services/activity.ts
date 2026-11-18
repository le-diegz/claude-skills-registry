import "server-only";
import type { Db } from "@/lib/db";
import type { Json } from "@/lib/db/database.types";

export type ActivityType =
  | "quote_created"
  | "quote_updated"
  | "quote_imported"
  | "quote_duplicated"
  | "quote_deleted"
  | "quote_status_changed"
  | "quote_accepted"
  | "quote_declined"
  | "followup_scheduled"
  | "followup_prepared"
  | "followup_approved"
  | "followup_sent"
  | "followup_failed"
  | "followup_skipped"
  | "followup_snoozed"
  | "followups_paused"
  | "followups_resumed"
  | "reply_recorded"
  | "note_added"
  | "attachment_added"
  | "attachment_removed"
  | "customer_created"
  | "customer_updated"
  | "customer_opt_out"
  | "import_completed";

export interface ActivityInput {
  organizationId: string;
  type: ActivityType;
  message: string;
  actorId?: string | null;
  quoteId?: string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity(db: Db, input: ActivityInput | ActivityInput[]): Promise<void> {
  const items = Array.isArray(input) ? input : [input];
  if (items.length === 0) return;
  const { error } = await db.from("activity_events").insert(
    items.map((i) => ({
      organization_id: i.organizationId,
      type: i.type,
      message: i.message,
      actor_id: i.actorId ?? null,
      quote_id: i.quoteId ?? null,
      customer_id: i.customerId ?? null,
      metadata: (i.metadata ?? {}) as NonNullable<Json>,
    })),
  );
  if (error) console.error("[activity]", error.message);
}
