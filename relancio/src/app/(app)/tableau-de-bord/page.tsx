import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarClock, CheckCircle2, FileText, Hourglass, Upload } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { FollowupList } from "@/components/followups/followup-list";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AmountChart } from "@/components/dashboard/amount-chart";
import { AddQuoteButton } from "@/components/quotes/add-quote-button";
import { loadStatsData } from "@/lib/queries/stats";
import { isEmailSendingEnabled, loadFollowupItems, loadTemplateOptions } from "@/lib/queries/followups";
import { computeMonthlySeries, computePeriodStats, computeSnapshot, periodFromPreset } from "@/lib/domain/stats";
import { expireOverdueQuotes, prepareDueFollowups } from "@/lib/services/followups";
import { formatCents } from "@/lib/domain/money";
import { toParis, formatDate, formatRelative, parisDaysBetween, todayParis, addDaysToDateOnly } from "@/lib/domain/dates";
import type { QuoteStatus } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Vue d'ensemble" };

function greeting() {
  const h = toParis(new Date()).getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

export default async function DashboardPage({ searchParams }: PageProps<"/tableau-de-bord">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const db = ctx.supabase;
  const orgId = ctx.organization.id;

  // Mise à jour idempotente des relances échues (le cron le fait aussi côté serveur)
  await expireOverdueQuotes(db, { organizationId: orgId });
  await prepareDueFollowups(db, { organizationId: orgId });

  const now = new Date();
  const [stats, followups, templates, emailEnabled, { data: activity }, { data: attention }] = await Promise.all([
    loadStatsData(db, orgId),
    loadFollowupItems(db, ctx.organization, { statuses: ["pending_approval", "to_prepare", "approved", "failed"], limit: 8 }),
    loadTemplateOptions(db, orgId),
    isEmailSendingEnabled(db, orgId),
    db.from("activity_events").select("id, message, created_at, quote_id, type, actor:profiles(full_name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8),
    db
      .from("quotes")
      .select("id, reference, title, status, amount_ht_cents, expires_on, issued_on, replied_at, updated_at, customer:customers(name)")
      .eq("organization_id", orgId)
      .or(`and(status.in.(sent,to_follow_up,followed_up),expires_on.lte.${addDaysToDateOnly(todayParis(), 7)}),status.eq.pending,and(status.eq.draft,issued_on.lte.${addDaysToDateOnly(todayParis(), -2)})`)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  const snap = computeSnapshot(stats.quotes, now);
  const p30 = periodFromPreset("30j", now);
  const prev30 = { from: new Date(p30.from.getTime() - 30 * 86_400_000), to: new Date(p30.from.getTime() - 1) };
  const period = computePeriodStats(stats.quotes, stats.followups, stats.replies, p30);
  const previous = computePeriodStats(stats.quotes, stats.followups, stats.replies, prev30);
  const series = computeMonthlySeries(stats.quotes, stats.followups, 6, now);
  const isEmpty = stats.quotes.length === 0;
  const firstName = (ctx.profile.full_name ?? "").split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm capitalize text-muted-foreground">{formatDate(now, "EEEE d MMMM")}</p>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {greeting()}{firstName ? ` ${firstName}` : ""}
          </h1>
          {!isEmpty && (
            <p className="text-sm text-muted-foreground">
              {followups.length > 0
                ? `${followups.length} relance${followups.length > 1 ? "s" : ""} prête${followups.length > 1 ? "s" : ""} à traiter.`
                : "Aucune relance à traiter pour le moment."}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/devis/import"><Upload /> Importer</Link>
          </Button>
          <AddQuoteButton />
        </div>
      </div>

      {sp.bienvenue === "1" && !isEmpty && (
        <div className="rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-accent-foreground">
          Votre espace est prêt. Les relances apparaissent dans « Priorités du jour » dès qu&apos;elles sont dues : vous validez chaque message avant envoi.
        </div>
      )}

      {isEmpty ? (
        <EmptyState icon={FileText} title="Aucun devis pour l'instant" description="Importez vos devis en cours depuis votre logiciel (CSV) ou ajoutez-en un : Relancio calcule ensuite les relances à faire.">
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline"><Link href="/devis/import"><Upload /> Importer un CSV</Link></Button>
            <AddQuoteButton />
          </div>
        </EmptyState>
      ) : (
        <>
          {/* Indicateurs */}
          <Card className="gap-0 py-0">
            <div className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-r-0">
              <Kpi label="Devis ouverts" value={String(snap.openCount)} sub={`${formatCents(snap.openAmountCents, { round: true })} HT en cours`} href="/devis?statut=ouverts" testId="kpi-open" />
              <Kpi
                label="À relancer aujourd'hui"
                value={String(snap.dueTodayCount)}
                sub={snap.dueTodayCount > 0 ? `${formatCents(snap.dueTodayAmountCents, { round: true })} HT concernés` : "Rien d'urgent"}
                tone={snap.dueTodayCount > 0 ? "warning" : undefined}
                href="/relances"
                testId="kpi-due"
              />
              <Kpi label="En retard de suivi" value={String(snap.overdueCount)} sub="Relance échue depuis plus d'un jour" tone={snap.overdueCount > 0 ? "danger" : undefined} href="/relances?onglet=retard" testId="kpi-overdue" />
              <Kpi
                label="Acceptés · 30 jours"
                value={String(period.acceptedCount)}
                sub={`${formatCents(period.acceptedAmountCents, { round: true })} HT${period.acceptanceRate !== null ? ` · taux ${Math.round(period.acceptanceRate * 100)} %` : ""}`}
                delta={period.acceptedAmountCents - previous.acceptedAmountCents}
                href="/statistiques"
                testId="kpi-accepted"
              />
            </div>
          </Card>
          <p className="-mt-3 text-xs text-muted-foreground">
            Le montant des devis ouverts est un potentiel commercial, pas un chiffre d&apos;affaires. Taux d&apos;acceptation : devis acceptés parmi les devis envoyés sur la période et déjà tranchés.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b py-4">
                  <CardTitle className="flex items-center gap-2 text-base"><BellRing className="size-4 text-primary" /> Priorités du jour</CardTitle>
                  <CardDescription>Relances prêtes : vérifiez le message, validez, puis envoyez ou copiez.</CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="sm" asChild><Link href="/relances">Tout voir <ArrowRight /></Link></Button>
                  </CardAction>
                </CardHeader>
                {followups.length === 0 ? (
                  <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-5 text-success" />
                    Aucune relance à traiter. Les prochaines apparaîtront ici automatiquement.
                  </div>
                ) : (
                  <FollowupList items={followups} templates={templates} emailEnabled={emailEnabled} isDemo={ctx.organization.is_demo} compact />
                )}
              </Card>

              <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b py-4">
                  <CardTitle className="flex items-center gap-2 text-base"><Hourglass className="size-4 text-primary" /> Devis nécessitant une action</CardTitle>
                  <CardDescription>Expiration proche, décision en attente ou brouillon non envoyé.</CardDescription>
                </CardHeader>
                {(attention ?? []).length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted-foreground">Rien à signaler.</p>
                ) : (
                  <ul className="divide-y">
                    {(attention ?? []).map((q) => (
                      <li key={q.id}>
                        <Link href={`/devis/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{q.customer?.name} <span className="font-normal text-muted-foreground">· {q.reference}</span></span>
                            <span className="block truncate text-sm text-muted-foreground">{attentionReason(q.status as QuoteStatus, q.expires_on, q.replied_at)}</span>
                          </span>
                          <span className="tabular hidden text-sm sm:block">{formatCents(q.amount_ht_cents, { round: true })}</span>
                          <QuoteStatusBadge status={q.status as QuoteStatus} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="gap-0 py-0">
                <CardHeader className="border-b py-4">
                  <CardTitle className="text-base">Actions rapides</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1 p-2">
                  <AddQuoteButton variant="ghost" className="justify-start" label="Ajouter un devis" />
                  <Button variant="ghost" className="justify-start" asChild><Link href="/devis/import"><Upload /> Importer des devis (CSV)</Link></Button>
                  <Button variant="ghost" className="justify-start" asChild><Link href="/relances"><BellRing /> Traiter les relances</Link></Button>
                  <Button variant="ghost" className="justify-start" asChild><Link href="/parametres/relances"><CalendarClock /> Régler les délais de relance</Link></Button>
                </CardContent>
              </Card>

              <Card className="gap-0 py-0">
                <CardHeader className="border-b py-4">
                  <CardTitle className="text-base">Activité récente</CardTitle>
                  <CardAction><Button variant="ghost" size="sm" asChild><Link href="/activite">Tout voir</Link></Button></CardAction>
                </CardHeader>
                <ul className="space-y-0 px-5 py-3">
                  {(activity ?? []).length === 0 && <li className="py-4 text-sm text-muted-foreground">Aucune activité.</li>}
                  {(activity ?? []).map((a) => (
                    <li key={a.id} className="relative border-l py-2 pl-4 text-sm">
                      <span className="absolute -left-[4.5px] top-3.5 size-2 rounded-full bg-border ring-2 ring-card" />
                      {a.quote_id ? <Link href={`/devis/${a.quote_id}`} className="hover:underline">{a.message}</Link> : a.message}
                      <span className="block text-xs text-muted-foreground">
                        {formatRelative(a.created_at)}{a.actor?.full_name ? ` · ${a.actor.full_name}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Évolution des performances</CardTitle>
                <CardDescription>Devis envoyés et acceptés, 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <PerformanceChart data={series} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Montant accepté par mois</CardTitle>
                <CardDescription>Total HT des devis acceptés, 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <AmountChart data={series} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function attentionReason(status: QuoteStatus, expiresOn: string | null, repliedAt: string | null) {
  if (status === "draft") return "Brouillon non envoyé";
  if (status === "pending") return `Réponse reçue ${repliedAt ? formatRelative(repliedAt) : ""} — décision à obtenir`;
  if (expiresOn) {
    const d = parisDaysBetween(new Date(), `${expiresOn}T12:00:00Z`);
    if (d < 0) return "Date de validité dépassée";
    if (d === 0) return "Expire aujourd'hui";
    return `Expire dans ${d} jour${d > 1 ? "s" : ""}`;
  }
  return "À suivre";
}

function Kpi({
  label,
  value,
  sub,
  tone,
  delta,
  href,
  testId,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warning" | "danger";
  delta?: number;
  href: string;
  testId?: string;
}) {
  return (
    <Link href={href} className="group block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warning" && "text-[#A75A04]", tone === "danger" && "text-destructive")}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {sub}
        {delta !== undefined && delta !== 0 && (
          <span className={cn("ml-1 font-medium", delta > 0 ? "text-success" : "text-destructive")}>
            {delta > 0 ? "▲" : "▼"} vs 30 j préc.
          </span>
        )}
      </p>
    </Link>
  );
}
