import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/database.types";
import { serverEnv } from "@/lib/env";

/** Client Supabase lié à la session de l'utilisateur : toutes les requêtes passent par RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
