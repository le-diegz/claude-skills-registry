import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsFilters } from "@/components/stats/stats-filters";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AmountChart } from "@/components/dashboard/amount-chart";
import { FollowupChart } from "@/components/stats/followup-chart";
import { loadStatsData } from "@/lib/queries/stats";
import {
  breakdownByService,
  breakdownLostReasons,
  computeMonthlySeries,
  computePeriodStats,
  computeSnapshot,
  periodFromPreset,
  PERIOD_PRESETS,
} from "@/lib/domain/stats";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { LOST_REASON_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS, type LostReason } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Statistiques" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);

export default async function StatsPage({ searchParams }: PageProps<"/statistiques">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const preset = typeof sp.periode === "string" && PERIOD_PRESETS.some((p) => p.value === sp.periode) ? sp.periode : "90j";
  const ownerId = typeof sp.responsable === "string" && /^[0-9a-f-]{36}$/.test(sp.responsable) ? sp.responsable : null;
  const serviceType = typeof sp.type === "string" && (SERVICE_TYPES as readonly string[]).includes(sp.type) ? sp.type : null;

  const [data, { data: members }] = await Promise.all([
    loadStatsData(ctx.supabase, ctx.organization.id, { ownerId, serviceType }),
    ctx.supabase.from("organization_members").select("user_id, profile:profiles(full_name, email)").eq("organization_id", ctx.organization.id),
  ]);
  const period = periodFromPreset(preset);
  const s = computePeriodStats(data.quotes, data.followups, data.replies, period);
  const snap = computeSnapshot(data.quotes);
  const months = preset === "12m" || preset === "annee" ? 12 : 6;
  const series = computeMonthlySeries(data.quotes, data.followups, months);
  const byService = breakdownByService(data.quotes, period);
  const lost = breakdownLostReasons(data.quotes, period);

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" description={`Du ${formatDate(period.from)} au ${formatDate(period.to)}`} />
      <StatsFilters members={(members ?? []).map((m) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || "Membre" }))} />

      <Card className="gap-0 py-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 [&>*]:border-b [&>*]:border-r">
          <Metric label="Devis envoyés" value={String(s.sentCount)} testId="stat-sent" />
          <Metric label="Devis acceptés" value={String(s.acceptedCount)} testId="stat-accepted" />
          <Metric label="Taux d'acceptation" value={pct(s.acceptanceRate)} hint={`${s.decidedCount} devis tranchés`} testId="stat-rate" />
          <Metric label="Montant accepté HT" value={formatCents(s.acceptedAmountCents, { round: true })} testId="stat-accepted-amount" />
          <Metric label="Devis ouverts HT" value={formatCents(snap.openAmountCents, { round: true })} hint="aujourd'hui, potentiel" />
          <Metric label="Relances effectuées" value={String(s.followupsSent)} hint={`${s.quotesFollowedUp} devis relancés`} testId="stat-followups" />
          <Metric label="Réponses après relance" value={String(s.repliesAfterFollowup)} hint="réponses enregistrées" />
          <Metric label="Acceptés après relance" value={String(s.acceptedAfterFollowup)} hint={`${s.acceptedWithoutFollowup} sans relance`} />
          <Metric
            label="Délai moyen de réponse"
            value={s.avgResponseDays === null ? "—" : `${s.avgResponseDays.toLocaleString("fr-FR")} j`}
            hint={s.responseSampleSize ? `sur ${s.responseSampleSize} devis` : "pas assez de données"}
          />
          <Metric label="Devis refusés" value={String(s.declinedCount)} />
          <Metric label="En retard de suivi" value={String(snap.overdueCount)} hint="aujourd'hui" />
          <Metric label="Brouillons" value={String(snap.draftCount)} hint="non envoyés" />
        </div>
      </Card>
      <p className="-mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        « Acceptés après relance » indique qu&apos;une relance a précédé l&apos;acceptation : c&apos;est une corrélation, pas la preuve que la relance a déclenché la vente.
        Le taux d&apos;acceptation porte sur les devis envoyés pendant la période et déjà acceptés, refusés ou expirés.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Devis envoyés et acceptés</CardTitle><CardDescription>Par mois, {months} derniers mois</CardDescription></CardHeader>
          <CardContent className="px-2 sm:px-6"><PerformanceChart data={series} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Montant accepté HT</CardTitle><CardDescription>Par mois, {months} derniers mois</CardDescription></CardHeader>
          <CardContent className="px-2 sm:px-6"><AmountChart data={series} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Relances effectuées</CardTitle><CardDescription>Email, téléphone ou manuel</CardDescription></CardHeader>
          <CardContent className="px-2 sm:px-6"><FollowupChart data={series} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Par type de prestation</CardTitle><CardDescription>Sur la période</CardDescription></CardHeader>
          <CardContent>
            {byService.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Prestation</TableHead>
                    <TableHead className="text-right text-xs">Envoyés</TableHead>
                    <TableHead className="text-right text-xs">Acceptés</TableHead>
                    <TableHead className="text-right text-xs">Montant HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byService.map((b) => (
                    <TableRow key={b.service}>
                      <TableCell>{SERVICE_TYPE_LABELS[b.service]}</TableCell>
                      <TableCell className="tabular text-right">{b.sent}</TableCell>
                      <TableCell className="tabular text-right">{b.accepted}</TableCell>
                      <TableCell className="tabular text-right">{formatCents(b.acceptedAmountCents, { round: true })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {lost.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Motifs de refus</p>
                <ul className="space-y-2">
                  {lost.map((l) => {
                    const total = lost.reduce((a, b) => a + b.count, 0);
                    return (
                      <li key={l.reason} className="grid grid-cols-[150px_1fr_32px] items-center gap-3 text-sm">
                        <span className="truncate">{l.reason === "non_renseigne" ? "Non renseigné" : LOST_REASON_LABELS[l.reason as LostReason]}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-chart-2" style={{ width: `${(l.count / total) * 100}%` }} /></span>
                        <span className="tabular text-right text-muted-foreground">{l.count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="px-4 py-3.5" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-xl font-semibold">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
