import "server-only";
import type { Db } from "@/lib/db";
import type { PolicyInput } from "@/lib/validation/schemas";

const hhmm = (m: number) => (m >= 1440 ? "23:59" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

export async function loadPolicyForm(db: Db, organizationId: string): Promise<PolicyInput> {
  const { data: p } = await db.from("followup_policies").select("*").eq("organization_id", organizationId).maybeSingle();
  return {
    first_delay_days: p?.first_delay_days ?? 3,
    second_delay_days: p?.second_delay_days ?? 7,
    third_delay_days: p?.third_delay_days ?? 14,
    max_followups: p?.max_followups ?? 3,
    business_days_only: p?.business_days_only ?? true,
    window_start: hhmm(p?.window_start_minutes ?? 540),
    window_end: hhmm(p?.window_end_minutes ?? 1080),
    auto_expire: p?.auto_expire ?? true,
  };
}
