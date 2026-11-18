import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createDemoOrganization } from "@/lib/demo/seed";
import { rateLimit } from "@/lib/services/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Crée un espace de démonstration isolé (utilisateur + entreprise fictive) et connecte le visiteur.
 * Chaque visiteur obtient ses propres données : aucune fuite entre démos ni vers des comptes réels.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Déjà dans une démo : on y retourne
  if (user?.email?.endsWith("@demo.relancio.invalid")) {
    return NextResponse.redirect(`${origin}/tableau-de-bord`);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = Number(process.env.DEMO_RATE_LIMIT_PER_HOUR ?? 8);
  if (!(await rateLimit(`demo-create:${ip}`, limit, 3600))) {
    return new NextResponse("Trop de démonstrations créées depuis cette adresse. Réessayez dans une heure.", { status: 429 });
  }

  if (user) await supabase.auth.signOut();

  const admin = createAdminClient();
  const email = `demo-${randomUUID()}@demo.relancio.invalid`;
  const password = randomBytes(24).toString("base64url") + "9a";
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Visiteur démo", demo: true },
  });
  if (error || !created.user) {
    console.error("[demo]", error?.message);
    return NextResponse.redirect(`${origin}/?erreur=demo`);
  }
  try {
    await createDemoOrganization(admin, created.user.id);
  } catch (e) {
    console.error("[demo]", e);
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.redirect(`${origin}/?erreur=demo`);
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return NextResponse.redirect(`${origin}/connexion`);
  return NextResponse.redirect(`${origin}/tableau-de-bord`);
}

export const POST = GET;
