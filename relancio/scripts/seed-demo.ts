/**
 * Crée (ou réinitialise) un compte de démonstration fixe pour les présentations commerciales.
 * Usage : npm run seed:demo   (lit .env.local)
 * Compte : demo@relancio.local / mot de passe DEMO_PASSWORD (par défaut « DemoRelancio2026 »)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/database.types";

config({ path: ".env.local", quiet: true });

const EMAIL = process.env.DEMO_EMAIL ?? "demo@relancio.local";
const PASSWORD = process.env.DEMO_PASSWORD ?? "DemoRelancio2026";

async function main() {
  const { createDemoOrganization, clearDemoData, seedDemoData } = await import("../src/lib/demo/seed");
  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Démo Commerciale" } });
    if (error) throw error;
    user = data.user!;
    console.log(`Utilisateur créé : ${EMAIL}`);
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, organization:organizations(is_demo)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.organization?.is_demo) {
    await clearDemoData(admin, membership.organization_id);
    const res = await seedDemoData(admin, membership.organization_id, user.id);
    console.log(`Démo réinitialisée : ${res.quotes} devis, ${res.customers} clients.`);
  } else {
    const orgId = await createDemoOrganization(admin, user.id);
    console.log(`Entreprise de démonstration créée (${orgId}).`);
  }
  console.log(`Connexion : ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
