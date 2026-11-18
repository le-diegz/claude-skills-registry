import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { SettingsSection, ReadOnlyNotice } from "@/components/settings/section";
import { EmailSettings } from "@/components/settings/email-settings";
import { isEmailProviderConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Email" };

export default async function Page({ searchParams }: PageProps<"/parametres/email">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const { data: integ } = await ctx.supabase.from("integrations").select("*").eq("organization_id", ctx.organization.id).eq("provider", "resend").maybeSingle();
  const editable = can(ctx.role, "email.manage") && !ctx.organization.is_demo;
  return (
    <SettingsSection title="Envoi des relances par email" description="Configuration de l'expéditeur et de l'adresse de réponse.">
      {sp.verification === "ok" && <p className="mb-4 rounded-md bg-success-soft px-3 py-2 text-sm text-success">Adresse de réponse vérifiée.</p>}
      {sp.verification === "invalide" && <p className="mb-4 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">Lien de vérification invalide ou expiré.</p>}
      {ctx.organization.is_demo && <p className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-[#7A4303]">Démonstration : aucun envoi réel n&apos;est possible.</p>}
      {!can(ctx.role, "email.manage") && <ReadOnlyNotice />}
      <EmailSettings
        providerConfigured={isEmailProviderConfigured()}
        fromAddress={process.env.RESEND_FROM_EMAIL ?? ""}
        initial={{ enabled: integ?.enabled ?? false, from_name: integ?.from_name || ctx.organization.name, reply_to_email: integ?.reply_to_email || ctx.organization.email || ctx.user.email }}
        verifiedAt={integ?.verified_at ?? null}
        editable={editable}
      />
    </SettingsSection>
  );
}
