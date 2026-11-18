import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireOverdueQuotes, prepareDueFollowups, sendQueuedApprovedJobs } from "@/lib/services/followups";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Tâche planifiée (Vercel Cron, toutes les heures) — idempotente :
 * 1. expire les devis dont la validité est dépassée,
 * 2. prépare les relances échues (statut « En attente de validation »),
 * 3. envoie les relances DÉJÀ VALIDÉES par un humain dont l'heure d'envoi est arrivée,
 * 4. nettoie les espaces de démonstration de plus de 7 jours.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const admin = createAdminClient();
  const started = Date.now();
  const expired = await expireOverdueQuotes(admin);
  const prepared = await prepareDueFollowups(admin, { limit: 2000 });
  const sent = await sendQueuedApprovedJobs(admin);

  // Nettoyage des démos anciennes
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: oldDemos } = await admin.from("organizations").select("id, created_by").eq("is_demo", true).lt("created_at", cutoff).limit(50);
  let demosDeleted = 0;
  for (const d of oldDemos ?? []) {
    await admin.from("organizations").delete().eq("id", d.id);
    if (d.created_by) {
      const { data: u } = await admin.auth.admin.getUserById(d.created_by);
      if (u.user?.email?.endsWith("@demo.relancio.invalid")) await admin.auth.admin.deleteUser(d.created_by);
    }
    demosDeleted++;
  }
  return NextResponse.json({ ok: true, ...expired, ...prepared, ...sent, demosDeleted, durationMs: Date.now() - started });
}
