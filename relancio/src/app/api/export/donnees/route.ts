import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/services/audit";
import { todayParis } from "@/lib/domain/dates";

/** Export complet (portabilité RGPD) des données de l'entreprise au format JSON. */
export async function GET() {
  const s = await getSession();
  if (!s.user || !s.organization) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(s.role, "data.export")) return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  const org = s.organization.id;
  const db = s.supabase;
  const tables = ["customers", "quotes", "followup_jobs", "followup_templates", "followup_policies", "communication_events", "activity_events", "quote_attachments", "import_jobs"] as const;
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    organization: s.organization,
    note: "Montants en centimes d'euro. Dates en UTC (ISO 8601). Les fichiers joints ne sont pas inclus : téléchargez-les depuis chaque devis.",
  };
  for (const t of tables) {
    const { data } = await db.from(t).select("*").eq("organization_id", org).limit(50000);
    out[t] = data ?? [];
  }
  const { data: members } = await db.from("organization_members").select("role, created_at, profile:profiles(full_name, email)").eq("organization_id", org);
  out.members = members ?? [];
  await logAudit(db, { organizationId: org, actorId: s.user.id, action: "data.exported" });
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="relancio-export-${todayParis()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
