import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/domain/constants";
import type { Tables } from "@/lib/db/database.types";

export type Organization = Tables<"organizations">;
export type Profile = Tables<"profiles">;

export interface AppContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string; emailConfirmed: boolean };
  profile: Profile;
  organization: Organization;
  role: Role;
  memberships: { organization: Pick<Organization, "id" | "name" | "is_demo">; role: Role }[];
}

/** Session courante (dédupliquée par requête). Ne redirige pas. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null } as const;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("organization_members")
      .select("role, organization:organizations(id, name, is_demo)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const list = (memberships ?? [])
    .filter((m) => m.organization)
    .map((m) => ({ organization: m.organization!, role: m.role as Role }));

  const current =
    list.find((m) => m.organization.id === profile?.current_organization_id) ?? list[0] ?? null;

  let organization: Organization | null = null;
  if (current) {
    const { data } = await supabase.from("organizations").select("*").eq("id", current.organization.id).single();
    organization = data;
  }

  return {
    supabase,
    user: { id: user.id, email: user.email ?? "", emailConfirmed: Boolean(user.email_confirmed_at) },
    profile,
    organization,
    role: current?.role ?? null,
    memberships: list,
  } as const;
});

/** Contexte applicatif complet : redirige vers la connexion ou l'onboarding si nécessaire. */
export async function requireAppContext(opts: { allowIncompleteOnboarding?: boolean } = {}): Promise<AppContext> {
  const s = await getSession();
  if (!s.user) redirect("/connexion");
  if (!s.user.emailConfirmed) redirect("/verifier-email");
  if (!s.organization || !s.role || !s.profile) redirect("/onboarding");
  if (!opts.allowIncompleteOnboarding && !s.organization.onboarding_completed_at) redirect("/onboarding");
  return {
    supabase: s.supabase,
    user: s.user,
    profile: s.profile,
    organization: s.organization,
    role: s.role,
    memberships: s.memberships,
  };
}
