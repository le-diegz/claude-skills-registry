import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { serverEnv } from "@/lib/env";

/**
 * Client service_role : CONTOURNE RLS. Réservé au cron, aux webhooks, à la démo,
 * à la suppression de compte et au rate limiting. Ne jamais l'utiliser pour une
 * requête dont le périmètre n'est pas explicitement filtré par organisation.
 */
export function createAdminClient() {
  return createClient<Database>(serverEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
