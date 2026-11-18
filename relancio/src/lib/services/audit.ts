import "server-only";
import { headers } from "next/headers";
import type { Db } from "@/lib/db";
import type { Json } from "@/lib/db/database.types";

export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  } catch {
    return null;
  }
}

/** Journal d'audit des opérations sensibles (append-only). */
export async function logAudit(
  db: Db,
  input: {
    organizationId: string | null;
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: (input.metadata ?? {}) as NonNullable<Json>,
    ip_address: await clientIp(),
  });
  if (error) console.error("[audit]", error.message);
}
