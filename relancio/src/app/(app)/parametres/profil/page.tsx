import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { SettingsSection } from "@/components/settings/section";
import { EmailForm, PasswordForm, ProfileForm } from "@/components/settings/profile-forms";
import { ROLE_LABELS } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Profil" };

export default async function Page() {
  const ctx = await requireAppContext();
  const demo = ctx.organization.is_demo;
  return (
    <>
      <SettingsSection title="Profil" description={`Rôle dans ${ctx.organization.name} : ${ROLE_LABELS[ctx.role]}`}>
        <ProfileForm fullName={ctx.profile.full_name ?? ""} phone={ctx.profile.phone ?? ""} />
      </SettingsSection>
      {!demo && (
        <SettingsSection title="Connexion" description="Un changement d'email doit être confirmé depuis la nouvelle adresse.">
          <div className="space-y-5">
            <EmailForm email={ctx.user.email} />
            <PasswordForm />
          </div>
        </SettingsSection>
      )}
    </>
  );
}
