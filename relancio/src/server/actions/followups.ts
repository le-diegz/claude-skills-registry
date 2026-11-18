"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { ActionError, fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { followupContentSchema } from "@/lib/validation/schemas";
import {
  approveJob,
  markJobSentManually,
  sendApprovedJob,
  skipJob,
  snoozeJob,
  updateJobContent,
  prepareDueFollowups,
} from "@/lib/services/followups";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { dateOnlyToInstant } from "@/lib/domain/dates";
import { formatDateTime } from "@/lib/domain/dates";

function revalidateAll(quoteId?: string) {
  revalidatePath("/relances");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/devis");
  if (quoteId) revalidatePath(`/devis/${quoteId}`);
}

const uuid = z.string().uuid();

export async function saveFollowupDraftAction(jobId: string, values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = followupContentSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    await updateJobContent(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, uuid.parse(jobId), {
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipientEmail: parsed.data.recipient_email,
    });
    revalidateAll();
    return ok(undefined, "Brouillon enregistré");
  });
}

export async function approveFollowupAction(jobId: string, values?: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    let content: { subject: string; body: string; recipientEmail: string | null } | undefined;
    if (values !== undefined) {
      const parsed = followupContentSchema.safeParse(values);
      if (!parsed.success) return fromZod(parsed.error);
      content = { subject: parsed.data.subject, body: parsed.data.body, recipientEmail: parsed.data.recipient_email };
    }
    await approveJob(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, uuid.parse(jobId), content);
    revalidateAll();
    return ok(undefined, "Relance validée");
  });
}

export async function approveFollowupsAction(jobIds: string[]): Promise<ActionResult<{ approved: number; errors: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const ids = z.array(uuid).min(1).max(200).parse(jobIds);
    let approved = 0;
    let errors = 0;
    for (const id of ids) {
      try {
        await approveJob(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id);
        approved++;
      } catch {
        errors++;
      }
    }
    revalidateAll();
    return ok({ approved, errors }, `${approved} relance${approved > 1 ? "s" : ""} validée${approved > 1 ? "s" : ""}`);
  });
}

async function integrationFor(ctx: Awaited<ReturnType<typeof actionContext>>) {
  const { data } = await ctx.supabase.from("integrations").select("*").eq("organization_id", ctx.organization.id).eq("provider", "resend").maybeSingle();
  return data;
}

export async function sendFollowupAction(jobId: string): Promise<ActionResult<{ status: "sent" | "queued" | "failed" }>> {
  return runAction<{ status: "sent" | "queued" | "failed" }>(async () => {
    const ctx = await actionContext();
    await enforceRateLimit("send-email", 60, 3600, ctx.organization.id);
    const integ = await integrationFor(ctx);
    if (!ctx.organization.is_demo && !integ?.enabled) {
      throw new ActionError("L'envoi par email n'est pas activé (Paramètres › Email). Utilisez « Copier » puis « Marquer comme envoyé ».");
    }
    const outcome = await sendApprovedJob(
      ctx.supabase,
      {
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        isDemo: ctx.organization.is_demo,
        fromName: integ?.from_name || ctx.organization.name,
        replyTo: integ?.verified_at ? integ.reply_to_email : null,
      },
      uuid.parse(jobId),
    );
    revalidateAll();
    if (outcome.status === "failed") return fail(`Échec de l'envoi : ${outcome.error}`);
    if (outcome.status === "queued") {
      return ok({ status: "queued" as const }, `Hors horaires autorisés : envoi programmé le ${formatDateTime(outcome.scheduledFor)}`);
    }
    return ok({ status: "sent" as const }, "Relance envoyée");
  });
}

const manualInput = z.object({
  channel: z.enum(["manual", "phone"]),
  note: z.string().trim().max(1000).nullable().optional(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(5000).optional(),
});

export async function markFollowupSentAction(jobId: string, input: z.input<typeof manualInput>): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = manualInput.safeParse(input);
    if (!parsed.success) return fromZod(parsed.error);
    await markJobSentManually(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, uuid.parse(jobId), {
      channel: parsed.data.channel,
      note: parsed.data.note ?? null,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    revalidateAll();
    return ok(undefined, parsed.data.channel === "phone" ? "Appel enregistré" : "Relance enregistrée comme envoyée");
  });
}

export async function markFollowupsSentAction(jobIds: string[]): Promise<ActionResult<{ done: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const ids = z.array(uuid).min(1).max(200).parse(jobIds);
    let done = 0;
    for (const id of ids) {
      try {
        await markJobSentManually(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id, { channel: "manual" });
        done++;
      } catch {
        /* ignorée */
      }
    }
    revalidateAll();
    return ok({ done }, `${done} relance${done > 1 ? "s" : ""} enregistrée${done > 1 ? "s" : ""}`);
  });
}

export async function snoozeFollowupsAction(jobIds: string[], date: string): Promise<ActionResult<{ done: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const ids = z.array(uuid).min(1).max(200).parse(jobIds);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Date invalide.");
    const until = dateOnlyToInstant(date, 0);
    let done = 0;
    let lastError = "";
    for (const id of ids) {
      try {
        await snoozeJob(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id, until);
        done++;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "";
      }
    }
    revalidateAll();
    if (done === 0) return fail(lastError || "Report impossible.");
    return ok({ done }, done > 1 ? `${done} relances reportées` : "Relance reportée");
  });
}

export async function skipFollowupsAction(jobIds: string[]): Promise<ActionResult<{ done: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const ids = z.array(uuid).min(1).max(200).parse(jobIds);
    let done = 0;
    for (const id of ids) {
      try {
        await skipJob(ctx.supabase, { organizationId: ctx.organization.id, userId: ctx.user.id }, id);
        done++;
      } catch {
        /* ignorée */
      }
    }
    revalidateAll();
    return ok({ done }, done > 1 ? `${done} relances ignorées` : "Relance ignorée");
  });
}

/** Rafraîchit les relances échues de l'organisation (idempotent, sans envoi). */
export async function refreshFollowupsAction(): Promise<ActionResult<{ prepared: number }>> {
  return runAction(async () => {
    const ctx = await actionContext();
    const res = await prepareDueFollowups(ctx.supabase, { organizationId: ctx.organization.id });
    revalidateAll();
    return ok(res);
  });
}
