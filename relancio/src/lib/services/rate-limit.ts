import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionError } from "@/lib/actions";
import { clientIp } from "./audit";

/**
 * Limitation de débit partagée entre instances (table Postgres, fenêtre fixe).
 * En cas d'indisponibilité de la base, la requête est autorisée (fail-open) et journalisée.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    if (error) {
      console.error("[rate-limit]", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit]", e);
    return true;
  }
}

export async function enforceRateLimit(scope: string, max: number, windowSeconds: number, identity?: string) {
  const id = identity ?? (await clientIp()) ?? "unknown";
  const allowed = await rateLimit(`${scope}:${id}`, max, windowSeconds);
  if (!allowed) throw new ActionError("Trop de tentatives. Patientez quelques minutes avant de réessayer.");
}
