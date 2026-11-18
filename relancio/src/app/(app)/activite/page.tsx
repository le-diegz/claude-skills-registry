import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline } from "@/components/app/timeline";
import { ActivityFilters } from "@/components/stats/activity-filters";
import { PaginationBar } from "@/components/app/pagination-bar";
import { formatDateTime } from "@/lib/domain/dates";

export const metadata: Metadata = { title: "Activité" };

const GROUPS: Record<string, string[]> = {
  devis: ["quote_created", "quote_updated", "quote_imported", "quote_duplicated", "quote_deleted", "quote_status_changed", "quote_accepted", "quote_declined", "note_added", "attachment_added", "attachment_removed"],
  relances: ["followup_scheduled", "followup_prepared", "followup_approved", "followup_sent", "followup_failed", "followup_skipped", "followup_snoozed", "followups_paused", "followups_resumed"],
  reponses: ["reply_recorded"],
  clients: ["customer_created", "customer_updated", "customer_opt_out"],
  imports: ["import_completed"],
};
const PAGE = 50;

const AUDIT_LABELS: Record<string, string> = {
  "organization.created": "Entreprise créée",
  "organization.updated": "Entreprise modifiée",
  "policy.updated": "Politique de relance modifiée",
  "quotes.deleted": "Devis supprimés",
  "quotes.exported": "Export CSV des devis",
  "customer.deleted": "Client supprimé",
  "customer.merged": "Clients fusionnés",
  "customer.opt_out": "Opposition au contact enregistrée",
  "customer.opt_in": "Opposition au contact levée",
  "member.invited": "Collaborateur invité",
  "member.role_changed": "Rôle modifié",
  "member.removed": "Collaborateur retiré",
  "invitation.revoked": "Invitation révoquée",
  "invitation.accepted": "Invitation acceptée",
  "email.configured": "Configuration email modifiée",
  "data.exported": "Export complet des données",
  "template.updated": "Modèle de relance modifié",
  "template.created": "Modèle de relance créé",
  "template.deleted": "Modèle de relance supprimé",
};

export default async function ActivityPage({ searchParams }: PageProps<"/activite">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const group = typeof sp.type === "string" && GROUPS[sp.type] ? sp.type : null;
  const actor = typeof sp.membre === "string" && /^[0-9a-f-]{36}$/.test(sp.membre) ? sp.membre : null;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  let q = ctx.supabase
    .from("activity_events")
    .select("id, type, message, created_at, quote_id, actor:profiles(full_name), quote:quotes(reference)", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (group) q = q.in("type", GROUPS[group]);
  if (actor) q = q.eq("actor_id", actor);
  const showAudit = can(ctx.role, "audit.read");
  const [{ data, count }, { data: members }, audit] = await Promise.all([
    q,
    ctx.supabase.from("organization_members").select("user_id, profile:profiles(full_name, email)").eq("organization_id", ctx.organization.id),
    showAudit
      ? ctx.supabase.from("audit_logs").select("id, action, created_at, ip_address, actor:profiles(full_name, email)").eq("organization_id", ctx.organization.id).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div>
      <PageHeader title="Activité" description="Tout ce qui s'est passé sur vos devis, relances et clients." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ActivityFilters members={(members ?? []).map((m) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || "Membre" }))} />
          {(data ?? []).length === 0 ? (
            <EmptyState icon={Activity} title="Aucune activité" />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Timeline showQuoteLinks events={(data ?? []).map((a) => ({ ...a, actor_name: a.actor?.full_name ?? null, quote_reference: a.quote?.reference ?? null }))} />
              </CardContent>
            </Card>
          )}
          <PaginationBar page={page} pageSize={PAGE} total={count ?? 0} />
        </div>
        {showAudit && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Journal d&apos;audit</CardTitle>
              <CardDescription>Opérations sensibles (visible par les administrateurs). Non modifiable.</CardDescription>
            </CardHeader>
            <CardContent>
              {(audit.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune opération sensible.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {(audit.data ?? []).map((l) => (
                    <li key={l.id}>
                      <p className="font-medium">{AUDIT_LABELS[l.action] ?? l.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(l.created_at)} · {l.actor?.full_name || l.actor?.email || "Système"}
                        {l.ip_address ? ` · ${l.ip_address}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
