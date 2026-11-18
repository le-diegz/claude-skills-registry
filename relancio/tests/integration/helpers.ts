import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

export type Db = SupabaseClient<Database>;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin: Db = createClient<Database>(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

/** Crée un utilisateur confirmé et retourne un client connecté (RLS appliquée). */
export async function createUser(name = "Test") {
  const email = `test-${randomUUID()}@relancio.test`;
  const password = "MotDePasse123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw error;
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user!.id, email, client };
}

/** Crée une entreprise (via la fonction SQL utilisée par l'application) avec son propriétaire. */
export async function createOrg(name = "Entreprise Test") {
  const owner = await createUser("Propriétaire");
  const { data: orgId, error } = await owner.client.rpc("create_organization", { p_name: name, p_trades: ["climatisation"] });
  if (error) throw error;
  return { orgId: orgId!, owner };
}

export async function addMember(orgId: string, role: "admin" | "member") {
  const user = await createUser(role);
  const { error } = await admin.from("organization_members").insert({ organization_id: orgId, user_id: user.id, role });
  if (error) throw error;
  await admin.from("profiles").update({ current_organization_id: orgId }).eq("id", user.id);
  return user;
}

export async function createCustomer(db: Db, orgId: string, over: Partial<Database["public"]["Tables"]["customers"]["Insert"]> = {}) {
  const { data, error } = await db
    .from("customers")
    .insert({ organization_id: orgId, name: "Client Test", email: `client-${randomUUID().slice(0, 8)}@exemple.test`, ...over })
    .select("*")
    .single();
  if (error) throw error;
  return data!;
}

export function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

export async function deleteOrg(orgId: string) {
  await admin.from("organizations").delete().eq("id", orgId);
}
