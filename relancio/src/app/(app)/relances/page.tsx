import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CheckCircle2, PauseCircle } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { FollowupCenter } from "@/components/followups/followup-center";
import { isEmailSendingEnabled, loadFollowupItems, loadTemplateOptions } from "@/lib/queries/followups";
import { expireOverdueQuotes, loadPolicy, prepareDueFollowups } from "@/lib/services/followups";
import { formatWindow } from "@/lib/domain/followup-engine";
import { startOfParisDay, formatRelative } from "@/lib/domain/dates";
import { formatCents } from "@/lib/domain/money";
import type { FollowupJobStatus, QuoteStatus } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Relances" };

const TABS = [
  { key: "a-traiter", label: "À traiter aujourd'hui" },
  { key: "retard", label: "En retard" },
  { key: "validation", label: "En attente de validation" },
  { key: "programmees", label: "Programmées" },
  { key: "envoyees", label: "Envoyées" },
  { key: "erreurs", label: "En erreur" },
  { key: "suspendues", label: "Suspendues" },
] as const;

export default async function FollowupsPage({ searchParams }: PageProps<"/relances">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.onglet)?.key ?? "a-traiter";
  const db = ctx.supabase;
  const orgId = ctx.organization.id;

  await expireOverdueQuotes(db, { organizationId: orgId });
  await prepareDueFollowups(db, { organizationId: orgId });

  const actionable: FollowupJobStatus[] = ["pending_approval", "to_prepare", "approved", "failed"];
  const [allActionable, scheduled, sent, templates, emailEnabled, { policy }, { data: paused }] = await Promise.all([
    loadFollowupItems(db, ctx.organization, { statuses: actionable, limit: 300 }),
    loadFollowupItems(db, ctx.organization, { statuses: ["scheduled"], limit: 300 }),
    loadFollowupItems(db, ctx.organization, { statuses: ["sent"], limit: 100, order: "desc", orderBy: "sent_at" }),
    loadTemplateOptions(db, orgId),
    isEmailSendingEnabled(db, orgId),
    loadPolicy(db, orgId),
    db
      .from("quotes")
      .select("id, reference, title, status, amount_ht_cents, followups_paused_reason, replied_at, updated_at, customer:customers(name, do_not_contact)")
      .eq("organization_id", orgId)
      .or("followups_paused.eq.true,status.eq.pending")
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  const todayStart = startOfParisDay(new Date()).getTime();
  const late = allActionable.filter((i) => new Date(i.scheduled_for).getTime() < todayStart && i.status !== "failed");
  const validation = allActionable.filter((i) => i.status === "pending_approval" || i.status === "to_prepare");
  const failed = allActionable.filter((i) => i.status === "failed");
  const counts: Record<string, number> = {
    "a-traiter": allActionable.length,
    retard: late.length,
    validation: validation.length,
    programmees: scheduled.length,
    envoyees: sent.length,
    erreurs: failed.length,
    suspendues: (paused ?? []).length,
  };
  const list =
    tab === "a-traiter" ? allActionable : tab === "retard" ? late : tab === "validation" ? validation : tab === "programmees" ? scheduled : tab === "envoyees" ? sent : tab === "erreurs" ? failed : [];

  return (
    <div>
      <PageHeader
        title="Relances"
        description={`Validation humaine obligatoire avant chaque envoi · ${policy.business_days_only ? "jours ouvrés" : "tous les jours"}, ${formatWindow(policy)}`}
        actions={<Button variant="outline" asChild><Link href="/parametres/relances">Politique de relance</Link></Button>}
      />
      <nav className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Catégories de relances">
        <ul className="flex min-w-max gap-1 border-b">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "a-traiter" ? "/relances" : `/relances?onglet=${t.key}`}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                  tab === t.key ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                aria-current={tab === t.key ? "page" : undefined}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[11px]", t.key === "erreurs" ? "bg-destructive-soft text-destructive" : t.key === "retard" ? "bg-warning-soft text-[#A75A04]" : "bg-muted text-muted-foreground")}>
                    {counts[t.key]}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "suspendues" ? (
        (paused ?? []).length === 0 ? (
          <EmptyState icon={PauseCircle} title="Aucun devis suspendu" description="Les devis en attente de décision ou dont les relances sont suspendues apparaissent ici." />
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {(paused ?? []).map((q) => (
              <li key={q.id}>
                <Link href={`/devis/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{q.customer?.name} <span className="font-normal text-muted-foreground">· {q.reference}</span></span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {q.customer?.do_not_contact
                        ? "Le client ne souhaite plus être recontacté"
                        : q.status === "pending"
                          ? `Réponse reçue ${q.replied_at ? formatRelative(q.replied_at) : ""} — décision attendue`
                          : "Relances suspendues manuellement"}
                    </span>
                  </span>
                  <span className="tabular hidden text-sm sm:block">{formatCents(q.amount_ht_cents, { round: true })}</span>
                  <QuoteStatusBadge status={q.status as QuoteStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === "a-traiter" ? CheckCircle2 : BellRing}
          title={tab === "a-traiter" ? "Tout est à jour" : "Rien dans cette catégorie"}
          description={tab === "a-traiter" ? "Aucune relance à traiter. Les prochaines apparaîtront automatiquement à leur échéance." : undefined}
        />
      ) : (
        <FollowupCenter
          items={list}
          templates={templates}
          emailEnabled={emailEnabled}
          isDemo={ctx.organization.is_demo}
          selectable={tab !== "envoyees"}
          mode={tab === "programmees" ? "scheduled" : tab === "envoyees" ? "history" : "actionable"}
        />
      )}
    </div>
  );
}
