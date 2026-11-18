"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth/guards";
import { fail, ok, runAction, type ActionResult } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearDemoData, seedDemoData } from "@/lib/demo/seed";
import { enforceRateLimit } from "@/lib/services/rate-limit";

export async function resetDemoAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    if (!ctx.organization.is_demo) return fail("Seul un espace de démonstration peut être réinitialisé.");
    await enforceRateLimit("demo-reset", 10, 3600, ctx.organization.id);
    const admin = createAdminClient();
    await clearDemoData(admin, ctx.organization.id);
    await seedDemoData(admin, ctx.organization.id, ctx.user.id);
    revalidatePath("/", "layout");
    return ok(undefined);
  });
}
