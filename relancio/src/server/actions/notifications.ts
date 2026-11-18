"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { ok, runAction, type ActionResult } from "@/lib/actions";

export async function listNotificationsAction(): Promise<
  ActionResult<{ id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[]>
> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { data } = await ctx.supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .eq("organization_id", ctx.organization.id)
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    return ok(data ?? []);
  });
}

export async function markNotificationsReadAction(ids: string[] | "all"): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    let q = ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", ctx.user.id)
      .eq("organization_id", ctx.organization.id)
      .is("read_at", null);
    if (ids !== "all") q = q.in("id", z.array(z.string().uuid()).max(200).parse(ids));
    await q;
    revalidatePath("/notifications");
    return ok(undefined);
  });
}

export async function markNotificationUnreadAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    await ctx.supabase.from("notifications").update({ read_at: null }).eq("id", z.string().uuid().parse(id)).eq("user_id", ctx.user.id);
    revalidatePath("/notifications");
    return ok(undefined);
  });
}
