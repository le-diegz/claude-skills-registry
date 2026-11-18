import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { SettingsSection, ReadOnlyNotice } from "@/components/settings/section";
import { OrganizationForm } from "@/components/settings/organization-form";
import type { ServiceType } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Entreprise" };

export default async function Page() {
  const ctx = await requireAppContext();
  const o = ctx.organization;
  const editable = can(ctx.role, "settings.manage");
  return (
    <SettingsSection title="Entreprise" description="Ces informations apparaissent dans vos messages de relance ({company_name}).">
      {!editable && <ReadOnlyNotice />}
      <OrganizationForm
        mode="update"
        disabled={!editable}
        defaults={{ name: o.name, legal_name: o.legal_name ?? "", siret: o.siret ?? "", email: o.email ?? "", phone: o.phone ?? "", address_line: o.address_line ?? "", postal_code: o.postal_code ?? "", city: o.city ?? "", trades: o.trades as ServiceType[] }}
      />
    </SettingsSection>
  );
}
