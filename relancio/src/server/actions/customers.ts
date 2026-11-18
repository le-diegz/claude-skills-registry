"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { assertNoError, fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { customerSchema } from "@/lib/validation/schemas";
import { findDuplicateCustomers } from "@/lib/domain/contact";
import { logActivity } from "@/lib/services/activity";
import { logAudit } from "@/lib/services/audit";

export async function findCustomerDuplicatesAction(input: { name?: string; email?: string; phone?: string; excludeId?: string }) {
  const ctx = await actionContext();
  const { data } = await ctx.supabase.from("customers").select("id, name, email, phone").eq("organization_id", ctx.organization.id).limit(5000);
  return findDuplicateCustomers(input, data ?? [], input.excludeId).slice(0, 5);
}

export async function createCustomerAction(values: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const { data, error } = await ctx.supabase
      .from("customers")
      .insert({ ...parsed.data, organization_id: ctx.organization.id, created_by: ctx.user.id })
      .select("id, name")
      .single();
    assertNoError(error, "Création du client");
    await logActivity(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: "customer_created",
      message: `Client ${data!.name} créé`,
      customerId: data!.id,
      actorId: ctx.user.id,
    });
    revalidatePath("/clients");
    return ok(data!, `Client ${data!.name} créé`);
  });
}

export async function updateCustomerAction(id: string, values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = customerSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const { data: before } = await ctx.supabase.from("customers").select("do_not_contact").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!before) return fail("Client introuvable.");
    const { error } = await ctx.supabase.from("customers").update(parsed.data).eq("id", id).eq("organization_id", ctx.organization.id);
    assertNoError(error, "Mise à jour du client");
    const optOut = parsed.data.do_not_contact && !before.do_not_contact;
    await logActivity(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: optOut ? "customer_opt_out" : "customer_updated",
      message: optOut
        ? `${parsed.data.name} ne souhaite plus être recontacté : relances suspendues`
        : `Client ${parsed.data.name} modifié`,
      customerId: id,
      actorId: ctx.user.id,
    });
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    revalidatePath("/relances");
    return ok(undefined, "Client mis à jour");
  });
}

export async function setDoNotContactAction(id: string, value: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const { data: c } = await ctx.supabase.from("customers").select("name").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!c) return fail("Client introuvable.");
    const { error } = await ctx.supabase.from("customers").update({ do_not_contact: value }).eq("id", id);
    assertNoError(error, "Mise à jour du client");
    await logActivity(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: value ? "customer_opt_out" : "customer_updated",
      message: value ? `${c.name} ne souhaite plus être recontacté : relances suspendues` : `${c.name} peut de nouveau être recontacté`,
      customerId: id,
      actorId: ctx.user.id,
    });
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: value ? "customer.opt_out" : "customer.opt_in", targetType: "customer", targetId: id });
    revalidatePath(`/clients/${id}`);
    revalidatePath("/relances");
    revalidatePath("/devis");
    return ok(undefined, value ? "Opposition enregistrée : relances suspendues" : "Le client peut être recontacté");
  });
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("customers.delete");
    const cid = z.string().uuid().parse(id);
    const { count } = await ctx.supabase.from("quotes").select("id", { count: "exact", head: true }).eq("customer_id", cid);
    if ((count ?? 0) > 0) return fail(`Ce client a ${count} devis. Supprimez ou réaffectez-les d'abord.`);
    const { data: c } = await ctx.supabase.from("customers").select("name").eq("id", cid).eq("organization_id", ctx.organization.id).maybeSingle();
    const { error } = await ctx.supabase.from("customers").delete().eq("id", cid).eq("organization_id", ctx.organization.id);
    assertNoError(error, "Suppression du client");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "customer.deleted", targetType: "customer", targetId: cid, metadata: { name: c?.name } });
    revalidatePath("/clients");
    return ok(undefined, "Client supprimé");
  });
}

export async function mergeCustomersAction(keepId: string, removeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("customers.delete");
    const ids = z.array(z.string().uuid()).length(2).parse([keepId, removeId]);
    if (ids[0] === ids[1]) return fail("Sélectionnez deux clients différents.");
    const { data: both } = await ctx.supabase.from("customers").select("id, name").eq("organization_id", ctx.organization.id).in("id", ids);
    if ((both ?? []).length !== 2) return fail("Clients introuvables.");
    await ctx.supabase.from("quotes").update({ customer_id: keepId }).eq("customer_id", removeId).eq("organization_id", ctx.organization.id);
    await ctx.supabase.from("communication_events").update({ customer_id: keepId }).eq("customer_id", removeId);
    const { error } = await ctx.supabase.from("customers").delete().eq("id", removeId);
    assertNoError(error, "Fusion des clients");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "customer.merged", targetType: "customer", targetId: keepId, metadata: { removed: removeId } });
    revalidatePath("/clients");
    return ok(undefined, "Clients fusionnés");
  });
}
