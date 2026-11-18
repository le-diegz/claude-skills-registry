"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/context";
import { actionContext } from "@/lib/auth/guards";
import { ActionError, assertNoError, fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { organizationSchema, policySchema, type PolicyInput } from "@/lib/validation/schemas";
import { logAudit } from "@/lib/services/audit";
import { resyncOrganizationFollowups } from "@/lib/services/maintenance";

export async function createOrganizationAction(values: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const s = await getSession();
    if (!s.user) throw new ActionError("Session expirée.");
    if (!s.user.emailConfirmed) throw new ActionError("Confirmez votre email avant de continuer.");
    const parsed = organizationSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    if (s.organization) {
      // Déjà créée : mise à jour (retour arrière dans l'onboarding)
      if (s.role !== "owner" && s.role !== "admin") throw new ActionError("Action non autorisée.");
      const { error } = await s.supabase.from("organizations").update({ ...d, onboarding_step: Math.max(s.organization.onboarding_step, 2) }).eq("id", s.organization.id);
      assertNoError(error, "Mise à jour de l'entreprise");
      return ok({ id: s.organization.id });
    }
    const { data: orgId, error } = await s.supabase.rpc("create_organization", {
      p_name: d.name,
      p_trades: d.trades,
      p_phone: d.phone ?? undefined,
      p_email: d.email ?? undefined,
      p_city: d.city ?? undefined,
      p_siret: d.siret ?? undefined,
    });
    assertNoError(error, "Création de l'entreprise");
    if (d.address_line || d.postal_code || d.legal_name) {
      await s.supabase.from("organizations").update({ address_line: d.address_line, postal_code: d.postal_code, legal_name: d.legal_name }).eq("id", orgId!);
    }
    await logAudit(s.supabase, { organizationId: orgId!, actorId: s.user.id, action: "organization.created", targetType: "organization", targetId: orgId! });
    return ok({ id: orgId! });
  });
}

export async function setOnboardingStepAction(step: number): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { error } = await ctx.supabase.from("organizations").update({ onboarding_step: Math.min(Math.max(step, 1), 4) }).eq("id", ctx.organization.id);
    assertNoError(error, "Onboarding");
    return ok(undefined);
  });
}

export async function completeOnboardingAction(): Promise<never> {
  const ctx = await actionContext();
  await ctx.supabase.from("organizations").update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 4 }).eq("id", ctx.organization.id);
  revalidatePath("/", "layout");
  redirect("/tableau-de-bord?bienvenue=1");
}

export async function updateOrganizationAction(values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("settings.manage");
    const parsed = organizationSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const { error } = await ctx.supabase.from("organizations").update(parsed.data).eq("id", ctx.organization.id);
    assertNoError(error, "Mise à jour de l'entreprise");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "organization.updated", targetType: "organization", targetId: ctx.organization.id });
    revalidatePath("/", "layout");
    return ok(undefined, "Entreprise mise à jour");
  });
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function savePolicyAction(values: PolicyInput): Promise<ActionResult<{ rescheduled: number }>> {
  return runAction(async () => {
    const ctx = await actionContext("policy.manage");
    const parsed = policySchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const d = parsed.data;
    const { error } = await ctx.supabase
      .from("followup_policies")
      .update({
        first_delay_days: d.first_delay_days,
        second_delay_days: d.second_delay_days,
        third_delay_days: d.max_followups >= 3 ? d.third_delay_days : (d.third_delay_days ?? null),
        max_followups: d.max_followups,
        business_days_only: d.business_days_only,
        window_start_minutes: toMinutes(d.window_start),
        window_end_minutes: d.window_end === "24:00" ? 1440 : toMinutes(d.window_end),
        auto_expire: d.auto_expire,
      })
      .eq("organization_id", ctx.organization.id);
    assertNoError(error, "Politique de relance");
    const rescheduled = await resyncOrganizationFollowups(ctx.supabase, ctx.organization.id, ctx.user.id);
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "policy.updated", metadata: d });
    revalidatePath("/", "layout");
    return ok({ rescheduled }, "Politique de relance enregistrée");
  });
}

export async function switchOrganizationAction(organizationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const s = await getSession();
    if (!s.user) throw new ActionError("Session expirée.");
    if (!s.memberships.some((m) => m.organization.id === organizationId)) return fail("Entreprise inaccessible.");
    await s.supabase.from("profiles").update({ current_organization_id: organizationId }).eq("id", s.user.id);
    revalidatePath("/", "layout");
    return ok(undefined);
  });
}
