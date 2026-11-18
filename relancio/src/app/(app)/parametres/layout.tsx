import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";

export default async function SettingsLayout({ children }: LayoutProps<"/parametres">) {
  const ctx = await requireAppContext();
  return (
    <div>
      <PageHeader title="Paramètres" description={ctx.organization.name} />
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav isAdmin={can(ctx.role, "settings.manage")} />
        <div className="min-w-0 flex-1 lg:max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
