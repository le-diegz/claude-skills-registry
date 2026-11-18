import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { SettingsSection } from "@/components/settings/section";
import { MembersManager } from "@/components/settings/members-manager";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Membres" };

export default async function Page() {
  const ctx = await requireAppContext();
  const canManage = can(ctx.role, "members.manage");
  const [{ data: members }, invitations] = await Promise.all([
    ctx.supabase.from("organization_members").select("user_id, role, created_at, profile:profiles(full_name, email)").eq("organization_id", ctx.organization.id).order("created_at"),
    canManage
      ? ctx.supabase.from("organization_invitations").select("id, email, role, expires_at").eq("organization_id", ctx.organization.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as { id: string; email: string; role: string; expires_at: string }[] }),
  ]);
  return (
    <>
      <SettingsSection title="Membres" description="Les permissions sont vérifiées côté serveur et dans la base de données.">
        <MembersManager
          members={(members ?? []).map((m) => ({ userId: m.user_id, name: m.profile?.full_name ?? "", email: m.profile?.email ?? "", role: m.role as Role, since: m.created_at }))}
          invitations={(invitations.data ?? []).map((i) => ({ ...i, role: i.role as Role }))}
          currentUserId={ctx.user.id}
          currentRole={ctx.role}
          canManage={canManage}
          isDemo={ctx.organization.is_demo}
        />
      </SettingsSection>
      <SettingsSection title="Rôles">
        <dl className="space-y-3 text-sm">
          {ROLES.map((r) => (
            <div key={r} className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr]">
              <dt className="font-medium">{ROLE_LABELS[r]}</dt>
              <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
      </SettingsSection>
    </>
  );
}
