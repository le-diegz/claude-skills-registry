"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { ActionError, assertNoError, fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { quoteSchema } from "@/lib/validation/schemas";
import { LOST_REASONS, QUOTE_STATUSES, type QuoteStatus } from "@/lib/domain/constants";
import {
  changeQuoteStatus,
  createQuote,
  duplicateQuote,
  recordReply,
  setFollowupsPaused,
  suggestNextReference,
  updateQuote,
} from "@/lib/services/quotes";
import { logActivity } from "@/lib/services/activity";
import { logAudit } from "@/lib/services/audit";

function revalidateQuotes(id?: string) {
  revalidatePath("/tableau-de-bord");
  revalidatePath("/devis");
  revalidatePath("/relances");
  revalidatePath("/statistiques");
  if (id) revalidatePath(`/devis/${id}`);
}

export async function getQuoteFormDataAction(): Promise<
  ActionResult<{
    reference: string;
    customers: { id: string; name: string; company_name: string | null; email: string | null; phone: string | null }[];
    members: { id: string; name: string }[];
    currentUserId: string;
  }>
> {
  return runAction(async () => {
    const ctx = await actionContext();
    const [reference, { data: customers }, { data: members }] = await Promise.all([
      suggestNextReference(ctx.supabase, ctx.organization.id),
      ctx.supabase.from("customers").select("id, name, company_name, email, phone").eq("organization_id", ctx.organization.id).order("name").limit(2000),
      ctx.supabase.from("organization_members").select("user_id, profile:profiles(full_name, email)").eq("organization_id", ctx.organization.id),
    ]);
    return ok({
      reference,
      customers: customers ?? [],
      members: (members ?? []).map((m) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || "Membre" })),
      currentUserId: ctx.user.id,
    });
  });
}

export async function createQuoteAction(values: unknown): Promise<ActionResult<{ id: string; reference: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const quote = await createQuote(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, parsed.data);
    revalidateQuotes();
    return ok(quote, `Devis ${quote.reference} créé`);
  });
}

export async function updateQuoteAction(id: string, values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    await updateQuote(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, z.string().uuid().parse(id), parsed.data);
    revalidateQuotes(id);
    return ok(undefined, "Devis mis à jour");
  });
}

const statusInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(QUOTE_STATUSES),
  lostReason: z.enum(LOST_REASONS).nullable().optional(),
  lostReasonDetails: z.string().trim().max(500).nullable().optional(),
});

export async function changeQuoteStatusAction(input: z.input<typeof statusInput>): Promise<ActionResult<{ updated: number; errors: string[] }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = statusInput.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);
    const errors: string[] = [];
    let updated = 0;
    for (const id of parsed.data.ids) {
      try {
        await changeQuoteStatus(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id, parsed.data.status as QuoteStatus, {
          lostReason: parsed.data.lostReason ?? null,
          lostReasonDetails: parsed.data.lostReasonDetails ?? null,
        });
        updated++;
      } catch (e) {
        errors.push(e instanceof ActionError ? e.message : "Erreur inattendue");
      }
    }
    revalidateQuotes(parsed.data.ids.length === 1 ? parsed.data.ids[0] : undefined);
    if (updated === 0 && errors.length > 0) return fail(errors[0]);
    return ok({ updated, errors }, updated > 1 ? `${updated} devis mis à jour` : "Statut mis à jour");
  });
}

export async function deleteQuotesAction(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  return runAction(async () => {
    const ctx = await actionContext("quotes.delete");
    const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(ids);
    if (!parsed.success) return fail("Sélection invalide.");
    const { data: quotes } = await ctx.supabase.from("quotes").select("id, reference").eq("organization_id", ctx.organization.id).in("id", parsed.data);
    // Suppression des pièces jointes du stockage
    const { data: files } = await ctx.supabase.from("quote_attachments").select("storage_path").in("quote_id", parsed.data);
    if (files && files.length > 0) await ctx.supabase.storage.from("quote-attachments").remove(files.map((f) => f.storage_path));
    const { error } = await ctx.supabase.from("quotes").delete().eq("organization_id", ctx.organization.id).in("id", parsed.data);
    assertNoError(error, "Suppression");
    await logAudit(ctx.supabase, {
      organizationId: ctx.organization.id,
      actorId: ctx.user.id,
      action: "quotes.deleted",
      targetType: "quote",
      metadata: { references: (quotes ?? []).map((q) => q.reference) },
    });
    await logActivity(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: "quote_deleted",
      message: (quotes ?? []).length > 1 ? `${quotes!.length} devis supprimés` : `Devis ${quotes?.[0]?.reference ?? ""} supprimé`,
      actorId: ctx.user.id,
    });
    revalidateQuotes();
    return ok({ deleted: (quotes ?? []).length }, (quotes ?? []).length > 1 ? `${quotes!.length} devis supprimés` : "Devis supprimé");
  });
}

export async function duplicateQuoteAction(id: string): Promise<ActionResult<{ id: string; reference: string }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const copy = await duplicateQuote(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, z.string().uuid().parse(id));
    revalidateQuotes();
    return ok(copy, `Copie ${copy.reference} créée (brouillon)`);
  });
}

const replyInput = z.object({
  quoteId: z.string().uuid(),
  channel: z.enum(["email", "phone", "other"]),
  summary: z.string().trim().max(2000).nullable().optional(),
});

export async function recordReplyAction(input: z.input<typeof replyInput>): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = replyInput.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);
    await recordReply(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, parsed.data.quoteId, {
      channel: parsed.data.channel,
      summary: parsed.data.summary ?? null,
    });
    revalidateQuotes(parsed.data.quoteId);
    return ok(undefined, "Réponse enregistrée — relances suspendues");
  });
}

export async function setFollowupsPausedAction(quoteIds: string[], paused: boolean): Promise<ActionResult<{ updated: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const ids = z.array(z.string().uuid()).min(1).max(500).parse(quoteIds);
    let updated = 0;
    let lastError: string | null = null;
    for (const id of ids) {
      try {
        await setFollowupsPaused(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id, paused, paused ? "suspendu_manuellement" : null);
        updated++;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Erreur";
      }
    }
    revalidateQuotes(ids.length === 1 ? ids[0] : undefined);
    if (updated === 0 && lastError) return fail(lastError);
    return ok({ updated }, paused ? "Relances suspendues" : "Relances reprises");
  });
}

export async function addQuoteNoteAction(quoteId: string, note: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const text = z.string().trim().min(1, "Note vide").max(2000).safeParse(note);
    if (!text.success) return fail(text.error.issues[0].message);
    const { data: q } = await ctx.supabase.from("quotes").select("id, customer_id").eq("id", quoteId).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!q) return fail("Devis introuvable.");
    await logActivity(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: "note_added",
      message: text.data,
      quoteId,
      customerId: q.customer_id,
      actorId: ctx.user.id,
    });
    revalidatePath(`/devis/${quoteId}`);
    return ok(undefined, "Note ajoutée");
  });
}

export async function canDeleteQuotes() {
  const ctx = await actionContext();
  return can(ctx.role, "quotes.delete");
}
