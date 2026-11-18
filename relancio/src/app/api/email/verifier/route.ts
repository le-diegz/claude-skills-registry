import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Confirme l'adresse de réponse d'une entreprise (lien reçu par email, valable 48 h). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const origin = request.nextUrl.origin;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return NextResponse.redirect(`${origin}/parametres/email?verification=invalide`);
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await admin.from("integrations").select("id, verification_sent_at").eq("verification_token_hash", hash).maybeSingle();
  if (!data || !data.verification_sent_at || Date.now() - new Date(data.verification_sent_at).getTime() > 48 * 3600_000) {
    return NextResponse.redirect(`${origin}/parametres/email?verification=invalide`);
  }
  await admin.from("integrations").update({ verified_at: new Date().toISOString(), verification_token_hash: null }).eq("id", data.id);
  return NextResponse.redirect(`${origin}/parametres/email?verification=ok`);
}
