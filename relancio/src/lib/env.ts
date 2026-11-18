import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get resendFromEmail() {
    return process.env.RESEND_FROM_EMAIL ?? "";
  },
  get resendWebhookSecret() {
    return process.env.RESEND_WEBHOOK_SECRET ?? "";
  },
};

/** Vrai si l'envoi d'emails par le fournisseur est configuré au niveau plateforme. */
export function isEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
