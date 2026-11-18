"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, passwordSchema } from "@/lib/validation/schemas";
import { fail, fromZod, ok, runAction, type ActionResult } from "@/lib/actions";
import { enforceRateLimit } from "@/lib/services/rate-limit";
import { serverEnv } from "@/lib/env";
import { z } from "zod";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/tableau-de-bord";
}

export async function signUpAction(values: unknown): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    await enforceRateLimit("signup", 10, 3600);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name },
        emailRedirectTo: `${serverEnv.appUrl}/auth/confirm?next=/onboarding`,
      },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) return fail("Un compte existe déjà avec cette adresse.");
      if (/password/i.test(error.message)) return fail("Mot de passe trop faible : 10 caractères avec lettres et chiffres.");
      return fail("Inscription impossible pour le moment. Réessayez.");
    }
    // Supabase renvoie un utilisateur sans identité si l'email existe déjà (anti-énumération)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return fail("Un compte existe déjà avec cette adresse.");
    }
    return ok({ email: parsed.data.email });
  });
}

export async function signInAction(values: unknown, next?: string): Promise<ActionResult> {
  const result = await runAction<undefined>(async () => {
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) return fromZod(parsed.error);
    await enforceRateLimit("signin", 20, 900);
    await enforceRateLimit("signin-email", 8, 900, parsed.data.email);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      if (/not confirmed/i.test(error.message)) return fail("Votre email n'est pas encore confirmé. Consultez votre boîte de réception.");
      return fail("Email ou mot de passe incorrect.");
    }
    return ok(undefined);
  });
  if (result.ok) redirect(safeNext(next));
  return result;
}

export async function requestPasswordResetAction(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = z.string().trim().toLowerCase().email().safeParse(email);
    if (!parsed.success) return fail("Adresse email invalide.");
    await enforceRateLimit("reset", 5, 3600);
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${serverEnv.appUrl}/auth/confirm?next=/reinitialiser-mot-de-passe`,
    });
    // Réponse identique que le compte existe ou non
    return ok(undefined, "Si un compte existe pour cette adresse, un email vient de vous être envoyé.");
  });
}

export async function updatePasswordAction(password: string): Promise<ActionResult> {
  const result = await runAction<undefined>(async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Mot de passe invalide");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Lien expiré : refaites une demande de réinitialisation.");
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    if (error) return fail(/different/i.test(error.message) ? "Choisissez un mot de passe différent de l'ancien." : "Mise à jour impossible.");
    return ok(undefined);
  });
  if (result.ok) redirect("/tableau-de-bord?motdepasse=ok");
  return result;
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = z.string().trim().toLowerCase().email().safeParse(email);
    if (!parsed.success) return fail("Adresse email invalide.");
    await enforceRateLimit("resend-verification", 5, 3600);
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: `${serverEnv.appUrl}/auth/confirm?next=/onboarding` },
    });
    if (error) return fail("Envoi impossible pour le moment. Réessayez dans une minute.");
    return ok(undefined, "Email de confirmation renvoyé.");
  });
}
