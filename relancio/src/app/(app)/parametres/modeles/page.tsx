import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { SettingsSection, ReadOnlyNotice } from "@/components/settings/section";
import { TemplatesEditor } from "@/components/settings/templates-editor";
import type { TemplateKind } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Modèles de relance" };
const ORDER: TemplateKind[] = ["first", "second", "last", "confirmation", "custom"];

export default async function Page() {
  const ctx = await requireAppContext();
  const { data } = await ctx.supabase.from("followup_templates").select("id, kind, name, subject, body, is_active, created_at").eq("organization_id", ctx.organization.id);
  const templates = (data ?? [])
    .map((t) => ({ ...t, kind: t.kind as TemplateKind }))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.created_at.localeCompare(b.created_at));
  const editable = can(ctx.role, "templates.manage");
  return (
    <SettingsSection title="Modèles de relance" description="La 1re relance utilise « Première relance », les suivantes « Deuxième relance », la dernière « Dernière relance ». Chaque message reste modifiable avant validation.">
      {!editable && <ReadOnlyNotice />}
      <TemplatesEditor templates={templates} companyName={ctx.organization.name} editable={editable} />
    </SettingsSection>
  );
}
