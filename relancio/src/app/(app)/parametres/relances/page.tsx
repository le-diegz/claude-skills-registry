import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { SettingsSection, ReadOnlyNotice } from "@/components/settings/section";
import { PolicyForm } from "@/components/settings/policy-form";
import { loadPolicyForm } from "@/lib/queries/policy";

export const metadata: Metadata = { title: "Politique de relance" };

export default async function Page() {
  const ctx = await requireAppContext();
  const defaults = await loadPolicyForm(ctx.supabase, ctx.organization.id);
  const editable = can(ctx.role, "policy.manage");
  return (
    <SettingsSection
      title="Politique de relance"
      description="Relancio calcule automatiquement les échéances. Pour un devis particulier, vous pouvez reporter, ignorer ou suspendre ses relances depuis sa fiche."
    >
      {!editable && <ReadOnlyNotice />}
      <PolicyForm defaults={defaults} disabled={!editable} />
    </SettingsSection>
  );
}
