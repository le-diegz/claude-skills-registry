import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPolicyForm } from "@/lib/queries/policy";
import { Logo } from "@/components/app/logo";
import { OnboardingFlow } from "./onboarding-flow";
import type { ServiceType } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const s = await getSession();
  if (!s.user) redirect("/connexion");
  if (!s.user.emailConfirmed) redirect("/verifier-email");
  if (s.organization?.onboarding_completed_at) redirect("/tableau-de-bord");

  // Invitations en attente pour cet email (un collaborateur invité n'a pas à créer d'entreprise)
  const admin = createAdminClient();
  const { data: invites } = s.organization
    ? { data: [] }
    : await admin
        .from("organization_invitations")
        .select("id, organization:organizations(name)")
        .ilike("email", s.user.email)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString());

  const o = s.organization;
  const policy = o ? await loadPolicyForm(s.supabase, o.id) : null;
  const { count } = o ? await s.supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", o.id) : { count: 0 };

  return (
    <div className="min-h-svh">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo href="/onboarding" />
        <form action="/auth/signout" method="post">
          <button className="text-sm text-muted-foreground hover:text-foreground">Se déconnecter</button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <OnboardingFlow
          initialStep={o ? Math.min(Math.max(o.onboarding_step, 2), 4) : 1}
          firstName={(s.profile?.full_name ?? "").split(" ")[0]}
          organization={o ? { name: o.name, phone: o.phone ?? "", email: o.email ?? "", city: o.city ?? "", siret: o.siret ?? "", trades: o.trades as ServiceType[] } : null}
          policy={policy}
          quoteCount={count ?? 0}
          invitations={(invites ?? []).map((i) => ({ id: i.id, name: i.organization?.name ?? "" }))}
        />
      </main>
    </div>
  );
}
