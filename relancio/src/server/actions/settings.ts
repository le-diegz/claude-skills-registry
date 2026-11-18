"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionContext } from "@/lib/auth/guards";
import { ActionError, assertNoError, fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { templateSchema, passwordSchema } from "@/lib/validation/schemas";
import { TEMPLATE_KINDS, type Role } from "@/lib/domain/constants";
import { unknownVariables } from "@/lib/domain/templates";
import { logAudit } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { sendEmail } from "@/lib/services/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailProviderConfigured, serverEnv } from "@/lib/env";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  full_name: z.string().trim().min(2, "2 caractères minimum").max(120),
  phone: z.string().trim().max(30).optional().transform((v) => v || null),
});

export async function updateProfileAction(values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const { error } = await ctx.supabase.from("profiles").update(parsed.data).eq("id", ctx.user.id);
    assertNoError(error, "Profil");
    await ctx.supabase.auth.updateUser({ data: { full_name: parsed.data.full_name } });
    revalidatePath("/", "layout");
    return ok(undefined, "Profil enregistré");
  });
}

export async function changePasswordAction(password: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    if (ctx.organization.is_demo) return fail("Indisponible en démonstration.");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data });
    if (error) return fail("Modification impossible. Choisissez un mot de passe différent.");
    return ok(undefined, "Mot de passe modifié");
  });
}

export async function changeEmailAction(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    if (ctx.organization.is_demo) return fail("Indisponible en démonstration.");
    const parsed = z.string().trim().toLowerCase().email().safeParse(email);
    if (!parsed.success) return fail("Adresse email invalide.");
    await enforceRateLimit("change-email", 5, 3600, ctx.user.id);
    const { error } = await ctx.supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${serverEnv.appUrl}/auth/confirm?next=/parametres/profil` });
    if (error) return fail("Changement impossible pour le moment.");
    return ok(undefined, "Un lien de confirmation a été envoyé à la nouvelle adresse.");
  });
}

const notifSchema = z.object({ notify_followups: z.boolean(), notify_imports: z.boolean(), notify_failures: z.boolean() });

export async function updateNotificationPrefsAction(values: z.input<typeof notifSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext();
    const parsed = notifSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const { error } = await ctx.supabase.from("profiles").update(parsed.data).eq("id", ctx.user.id);
    assertNoError(error, "Préférences");
    return ok(undefined, "Préférences enregistrées");
  });
}

// ---------------------------------------------------------------------------
// Modèles de relance
// ---------------------------------------------------------------------------
export async function saveTemplateAction(id: string | null, values: unknown, kind?: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await actionContext("templates.manage");
    const parsed = templateSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    const unknown = unknownVariables(parsed.data.subject + parsed.data.body);
    if (unknown.length) return fail(`Variable inconnue : {${unknown[0]}}`);
    if (id) {
      const { error } = await ctx.supabase.from("followup_templates").update(parsed.data).eq("id", id).eq("organization_id", ctx.organization.id);
      assertNoError(error, "Modèle");
      await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "template.updated", targetType: "template", targetId: id });
      revalidatePath("/parametres/modeles");
      return ok({ id }, "Modèle enregistré");
    }
    const k = z.enum(TEMPLATE_KINDS).catch("custom").parse(kind);
    const { data, error } = await ctx.supabase.from("followup_templates").insert({ ...parsed.data, kind: k, organization_id: ctx.organization.id }).select("id").single();
    assertNoError(error, "Modèle");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "template.created", targetType: "template", targetId: data!.id });
    revalidatePath("/parametres/modeles");
    return ok({ id: data!.id }, "Modèle créé");
  });
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("templates.manage");
    const { data: t } = await ctx.supabase.from("followup_templates").select("kind").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
    if (!t) return fail("Modèle introuvable.");
    if (t.kind !== "custom") return fail("Les modèles de relance standard peuvent être modifiés mais pas supprimés.");
    const { error } = await ctx.supabase.from("followup_templates").delete().eq("id", id);
    assertNoError(error, "Suppression du modèle");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "template.deleted", targetType: "template", targetId: id });
    revalidatePath("/parametres/modeles");
    return ok(undefined, "Modèle supprimé");
  });
}

// ---------------------------------------------------------------------------
// Email (Resend)
// ---------------------------------------------------------------------------
const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  from_name: z.string().trim().min(2, "Nom d'expéditeur requis").max(80),
  reply_to_email: z.string().trim().toLowerCase().email("Adresse invalide"),
});

export async function saveEmailSettingsAction(values: z.input<typeof emailSettingsSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("email.manage");
    if (ctx.organization.is_demo) return fail("La configuration email est désactivée en démonstration.");
    const parsed = emailSettingsSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    if (parsed.data.enabled && !isEmailProviderConfigured()) return fail("Le fournisseur d'email n'est pas configuré sur ce serveur (RESEND_API_KEY).");
    const { data: current } = await ctx.supabase.from("integrations").select("reply_to_email, verified_at").eq("organization_id", ctx.organization.id).eq("provider", "resend").single();
    const changedAddress = current?.reply_to_email !== parsed.data.reply_to_email;
    const { error } = await ctx.supabase
      .from("integrations")
      .update({ ...parsed.data, ...(changedAddress ? { verified_at: null, verification_token_hash: null } : {}) })
      .eq("organization_id", ctx.organization.id)
      .eq("provider", "resend");
    assertNoError(error, "Configuration email");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "email.configured", metadata: { enabled: parsed.data.enabled } });
    revalidatePath("/parametres/email");
    return ok(undefined, changedAddress ? "Enregistré. Vérifiez l'adresse de réponse." : "Enregistré");
  });
}

export async function sendSenderVerificationAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("email.manage");
    if (ctx.organization.is_demo) return fail("Indisponible en démonstration.");
    if (!isEmailProviderConfigured()) return fail("Le fournisseur d'email n'est pas configuré.");
    await enforceRateLimit("sender-verify", 5, 3600, ctx.organization.id);
    const { data: integ } = await ctx.supabase.from("integrations").select("*").eq("organization_id", ctx.organization.id).eq("provider", "resend").single();
    if (!integ?.reply_to_email) return fail("Renseignez d'abord l'adresse de réponse.");
    const token = randomBytes(24).toString("base64url");
    await ctx.supabase.from("integrations").update({ verification_token_hash: hash(token), verification_sent_at: new Date().toISOString() }).eq("id", integ.id);
    const link = `${serverEnv.appUrl}/api/email/verifier?token=${token}`;
    const res = await sendEmail({
      to: integ.reply_to_email,
      subject: "Confirmez votre adresse de réponse — Relancio",
      text: `Bonjour,\n\nPour que les réponses à vos relances arrivent à cette adresse, confirmez-la en ouvrant ce lien :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nRelancio`,
      fromName: "Relancio",
      idempotencyKey: `verify-${integ.id}-${hash(token).slice(0, 16)}`,
    });
    if (!res.ok) return fail(`Envoi impossible : ${res.error}`);
    return ok(undefined, `Email de vérification envoyé à ${integ.reply_to_email}`);
  });
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("email.manage");
    if (ctx.organization.is_demo) return fail("Indisponible en démonstration.");
    if (!isEmailProviderConfigured()) return fail("Le fournisseur d'email n'est pas configuré.");
    await enforceRateLimit("test-email", 5, 3600, ctx.organization.id);
    const { data: integ } = await ctx.supabase.from("integrations").select("*").eq("organization_id", ctx.organization.id).eq("provider", "resend").single();
    const res = await sendEmail({
      to: ctx.user.email,
      subject: "Email de test — Relancio",
      text: `Bonjour,\n\nCet email de test confirme que l'envoi de vos relances fonctionne.\nExpéditeur affiché : ${integ?.from_name || ctx.organization.name}\nAdresse de réponse : ${integ?.verified_at ? integ.reply_to_email : "non vérifiée"}\n\nRelancio`,
      fromName: integ?.from_name || ctx.organization.name,
      replyTo: integ?.verified_at ? integ.reply_to_email : null,
      idempotencyKey: `test-${ctx.organization.id}-${Date.now()}`,
    });
    if (!res.ok) return fail(`Échec : ${res.error}`);
    return ok(undefined, `Email de test envoyé à ${ctx.user.email}`);
  });
}

// ---------------------------------------------------------------------------
// Membres et invitations
// ---------------------------------------------------------------------------
const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email("Adresse invalide"), role: z.enum(["admin", "member"]) });

export async function inviteMemberAction(values: z.input<typeof inviteSchema>): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  return runAction(async () => {
    const ctx = await actionContext("members.manage");
    if (ctx.organization.is_demo) return fail("Les invitations sont désactivées en démonstration.");
    const parsed = inviteSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    await enforceRateLimit("invite", 30, 3600, ctx.organization.id);
    const { data: existing } = await ctx.supabase
      .from("organization_members")
      .select("user_id, profile:profiles!inner(email)")
      .eq("organization_id", ctx.organization.id)
      .eq("profile.email", parsed.data.email);
    if ((existing ?? []).length > 0) return fail("Cette personne fait déjà partie de l'équipe.");
    await ctx.supabase
      .from("organization_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", ctx.organization.id)
      .ilike("email", parsed.data.email)
      .is("accepted_at", null)
      .is("revoked_at", null);
    const token = randomBytes(24).toString("base64url");
    const { error } = await ctx.supabase.from("organization_invitations").insert({
      organization_id: ctx.organization.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token_hash: hash(token),
      invited_by: ctx.user.id,
    });
    assertNoError(error, "Invitation");
    const link = `${serverEnv.appUrl}/invitation/${token}`;
    let emailed = false;
    if (isEmailProviderConfigured()) {
      const res = await sendEmail({
        to: parsed.data.email,
        subject: `${ctx.profile.full_name || "Un collègue"} vous invite sur Relancio`,
        text: `Bonjour,\n\n${ctx.profile.full_name || "Un collègue"} vous invite à rejoindre ${ctx.organization.name} sur Relancio pour suivre les devis et les relances.\n\nAccepter l'invitation (valable 7 jours) :\n${link}\n\nRelancio`,
        fromName: "Relancio",
        idempotencyKey: `invite-${hash(token).slice(0, 24)}`,
      });
      emailed = res.ok;
    }
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "member.invited", metadata: { email: parsed.data.email, role: parsed.data.role } });
    revalidatePath("/parametres/membres");
    return ok({ link, emailed }, emailed ? "Invitation envoyée par email" : "Invitation créée : copiez le lien");
  });
}

export async function revokeInvitationAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("members.manage");
    const { error } = await ctx.supabase.from("organization_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("organization_id", ctx.organization.id);
    assertNoError(error, "Invitation");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "invitation.revoked", targetId: id });
    revalidatePath("/parametres/membres");
    return ok(undefined, "Invitation révoquée");
  });
}

export async function changeMemberRoleAction(userId: string, role: Role): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await actionContext("members.manage");
    const r = z.enum(["owner", "admin", "member"]).parse(role);
    const { data: target } = await ctx.supabase.from("organization_members").select("role").eq("organization_id", ctx.organization.id).eq("user_id", userId).maybeSingle();
    if (!target) return fail("Membre introuvable.");
    // Seul un propriétaire peut nommer ou modifier un propriétaire
    if ((r === "owner" || target.role === "owner") && ctx.role !== "owner") throw new ActionError("Seul un propriétaire peut gérer les propriétaires.");
    const { error } = await ctx.supabase.from("organization_members").update({ role: r }).eq("organization_id", ctx.organization.id).eq("user_id", userId);
    assertNoError(error, "Rôle");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "member.role_changed", targetType: "user", targetId: userId, metadata: { from: target.role, to: r } });
    revalidatePath("/parametres/membres");
    return ok(undefined, "Rôle mis à jour");
  });
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const self = userId === (await actionContext()).user.id;
    const ctx = await actionContext(self ? undefined : "members.manage");
    const { data: target } = await ctx.supabase.from("organization_members").select("role").eq("organization_id", ctx.organization.id).eq("user_id", userId).maybeSingle();
    if (!target) return fail("Membre introuvable.");
    if (target.role === "owner" && ctx.role !== "owner") throw new ActionError("Seul un propriétaire peut retirer un propriétaire.");
    const { error } = await ctx.supabase.from("organization_members").delete().eq("organization_id", ctx.organization.id).eq("user_id", userId);
    assertNoError(error, "Retrait du membre");
    await logAudit(ctx.supabase, { organizationId: ctx.organization.id, actorId: ctx.user.id, action: "member.removed", targetType: "user", targetId: userId });
    if (self) {
      await ctx.supabase.from("profiles").update({ current_organization_id: null }).eq("id", ctx.user.id);
      redirect("/onboarding");
    }
    revalidatePath("/parametres/membres");
    return ok(undefined, "Membre retiré");
  });
}

// ---------------------------------------------------------------------------
// Suppression du compte / de l'entreprise
// ---------------------------------------------------------------------------
export async function deleteOrganizationAction(confirmName: string): Promise<ActionResult> {
  const result = await runAction<undefined>(async () => {
    const ctx = await actionContext("organization.delete");
    if (confirmName.trim() !== ctx.organization.name) return fail("Le nom saisi ne correspond pas.");
    const admin = createAdminClient();
    // Fichiers du stockage
    const { data: files } = await admin.from("quote_attachments").select("storage_path").eq("organization_id", ctx.organization.id);
    if (files && files.length) await admin.storage.from("quote-attachments").remove(files.map((f) => f.storage_path));
    await logAudit(ctx.supabase, { organizationId: null, actorId: ctx.user.id, action: "organization.deleted", targetType: "organization", targetId: ctx.organization.id, metadata: { name: ctx.organization.name } });
    const { error } = await admin.from("organizations").delete().eq("id", ctx.organization.id);
    assertNoError(error, "Suppression de l'entreprise");
    return ok(undefined);
  });
  if (result.ok) redirect("/onboarding");
  return result;
}

export async function deleteAccountAction(confirmEmail: string): Promise<ActionResult> {
  const result = await runAction<undefined>(async () => {
    const ctx = await actionContext();
    if (confirmEmail.trim().toLowerCase() !== ctx.user.email.toLowerCase()) return fail("L'email saisi ne correspond pas.");
    const admin = createAdminClient();
    const { data: memberships } = await admin.from("organization_members").select("organization_id, role").eq("user_id", ctx.user.id);
    for (const m of memberships ?? []) {
      if (m.role !== "owner") continue;
      const { count } = await admin.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", m.organization_id).eq("role", "owner");
      const { count: members } = await admin.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", m.organization_id);
      if ((count ?? 0) <= 1 && (members ?? 0) > 1) {
        throw new ActionError("Vous êtes le seul propriétaire d'une entreprise qui a d'autres membres : nommez un autre propriétaire avant de supprimer votre compte.");
      }
      if ((members ?? 0) <= 1) {
        const { data: files } = await admin.from("quote_attachments").select("storage_path").eq("organization_id", m.organization_id);
        if (files && files.length) await admin.storage.from("quote-attachments").remove(files.map((f) => f.storage_path));
        await admin.from("organizations").delete().eq("id", m.organization_id);
      }
    }
    await admin.from("audit_logs").insert({ organization_id: null, actor_id: null, action: "account.deleted", target_type: "user", target_id: ctx.user.id });
    const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
    if (error) throw new Error(error.message);
    await ctx.supabase.auth.signOut();
    return ok(undefined);
  });
  if (result.ok) redirect("/?compte=supprime");
  return result;
}
