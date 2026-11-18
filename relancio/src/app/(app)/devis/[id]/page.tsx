import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, ShieldOff, Info } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuoteStatusBadge, JobStatusBadge } from "@/components/app/status-badge";
import { Timeline } from "@/components/app/timeline";
import { QuoteDetailActions } from "@/components/quotes/quote-detail-actions";
import type { QuoteFormInitial } from "@/components/quotes/quote-form-dialog";
import { AttachmentsCard } from "@/components/quotes/attachments-card";
import { NoteForm } from "@/components/quotes/note-form";
import { FollowupList } from "@/components/followups/followup-list";
import { isEmailSendingEnabled, loadFollowupItems, loadTemplateOptions } from "@/lib/queries/followups";
import { loadPolicy } from "@/lib/services/followups";
import { followupEligibility, INELIGIBILITY_LABELS, effectiveMaxFollowups } from "@/lib/domain/followup-engine";
import { formatCents, formatVatRate, centsToInput } from "@/lib/domain/money";
import { formatDate, formatDateTime } from "@/lib/domain/dates";
import { formatPhone } from "@/lib/domain/contact";
import { displayStatus } from "@/lib/domain/quote-status";
import {
  CUSTOMER_TYPE_LABELS,
  LOST_REASON_LABELS,
  SERVICE_TYPE_LABELS,
  type CustomerType,
  type FollowupJobStatus,
  type LostReason,
  type QuoteStatus,
  type ServiceType,
} from "@/lib/domain/constants";

export async function generateMetadata({ params }: PageProps<"/devis/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Devis ${id.slice(0, 8)}` };
}

export default async function QuotePage({ params }: PageProps<"/devis/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await requireAppContext();
  const db = ctx.supabase;
  const { data: quote } = await db
    .from("quotes")
    .select("*, customer:customers(*), owner:profiles!quotes_owner_id_fkey(full_name, email)")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!quote || !quote.customer) notFound();

  const [openItems, templates, emailEnabled, { policy }, { data: history }, { data: activity }, { data: attachments }, { data: comms }] = await Promise.all([
    loadFollowupItems(db, ctx.organization, { statuses: ["pending_approval", "to_prepare", "approved", "failed"], quoteId: id }),
    loadTemplateOptions(db, ctx.organization.id),
    isEmailSendingEnabled(db, ctx.organization.id),
    loadPolicy(db, ctx.organization.id),
    db.from("followup_jobs").select("id, sequence, status, channel, scheduled_for, sent_at, cancelled_reason").eq("quote_id", id).order("sequence"),
    db.from("activity_events").select("id, type, message, created_at, actor:profiles(full_name)").eq("quote_id", id).order("created_at", { ascending: false }).limit(100),
    db.from("quote_attachments").select("id, file_name, size_bytes, created_at").eq("quote_id", id).order("created_at", { ascending: false }),
    db.from("communication_events").select("id, direction, kind, channel, delivery_status, summary, occurred_at").eq("quote_id", id).order("occurred_at", { ascending: false }),
  ]);

  const status = quote.status as QuoteStatus;
  const shown = displayStatus(status, quote.next_followup_at);
  const steps = (history ?? []).filter((h) => h.status === "sent" || h.status === "skipped").reduce((m, h) => Math.max(m, h.sequence), 0);
  const elig = followupEligibility(
    { status, followups_paused: quote.followups_paused, followup_count: steps, customer_do_not_contact: quote.customer.do_not_contact, sent_at: quote.sent_at },
    policy,
  );
  const c = quote.customer;
  const formInitial = {
    reference: quote.reference,
    customer_id: quote.customer_id,
    new_customer: null,
    title: quote.title,
    service_type: quote.service_type as ServiceType,
    description: quote.description ?? "",
    amount_ht: centsToInput(quote.amount_ht_cents),
    vat_rate_bp: quote.vat_rate_bp,
    amount_ttc: centsToInput(quote.amount_ttc_cents),
    issued_on: quote.issued_on,
    sent_on: quote.sent_at ? formatDate(quote.sent_at, "yyyy-MM-dd") : "",
    expires_on: quote.expires_on ?? "",
    status,
    currentStatus: status,
    owner_id: quote.owner_id ?? "",
    notes: quote.notes ?? "",
    lost_reason: ((quote.lost_reason as LostReason | null) ?? "") as LostReason | "",
  } satisfies QuoteFormInitial;

  return (
    <div className="space-y-6">
      <Link href="/devis" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Devis
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold sm:text-2xl" data-testid="quote-reference">{quote.reference}</h1>
            <QuoteStatusBadge status={shown} />
            {quote.followups_paused && <Badge variant="outline">Relances suspendues</Badge>}
          </div>
          <p className="text-muted-foreground">{quote.title}</p>
          <p className="text-sm">
            <Link href={`/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
            <span className="text-muted-foreground"> · {formatCents(quote.amount_ht_cents)} HT</span>
          </p>
        </div>
        <QuoteDetailActions quoteId={id} status={status} paused={quote.followups_paused} canDelete={can(ctx.role, "quotes.delete")} formInitial={formInitial} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Relances */}
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Relances</CardTitle>
              <CardDescription>
                {elig.eligible
                  ? quote.next_followup_at
                    ? `Prochaine relance : ${formatDateTime(quote.next_followup_at)} (n°${steps + 1} sur ${effectiveMaxFollowups(policy)})`
                    : "Relance en cours de préparation"
                  : INELIGIBILITY_LABELS[elig.reason]}
              </CardDescription>
            </CardHeader>
            {openItems.length > 0 && <FollowupList items={openItems} templates={templates} emailEnabled={emailEnabled} isDemo={ctx.organization.is_demo} />}
            <div className="px-5 py-4">
              {(history ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune relance pour ce devis.</p>
              ) : (
                <ul className="space-y-2">
                  {(history ?? []).map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 text-muted-foreground">Relance n°{h.sequence}</span>
                      <JobStatusBadge status={h.status as FollowupJobStatus} />
                      <span className="text-muted-foreground">
                        {h.status === "sent"
                          ? `le ${formatDate(h.sent_at)}${h.channel === "phone" ? " · téléphone" : h.channel === "manual" ? " · manuel" : " · email"}`
                          : h.status === "cancelled"
                            ? `prévue le ${formatDate(h.scheduled_for)}`
                            : `le ${formatDate(h.scheduled_for)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Informations */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <Field label="Montant HT" value={<span className="tabular font-semibold">{formatCents(quote.amount_ht_cents)}</span>} />
                <Field label="TVA" value={formatVatRate(quote.vat_rate_bp)} />
                <Field label="Montant TTC" value={<span className="tabular">{formatCents(quote.amount_ttc_cents)}</span>} />
                <Field label="Prestation" value={SERVICE_TYPE_LABELS[quote.service_type as ServiceType]} />
                <Field label="Date du devis" value={formatDate(quote.issued_on)} />
                <Field label="Envoyé le" value={formatDate(quote.sent_at)} />
                <Field label="Expiration" value={formatDate(quote.expires_on)} />
                <Field label="Responsable" value={quote.owner?.full_name || quote.owner?.email || "—"} />
                <Field label="Créé le" value={formatDate(quote.created_at)} />
                {quote.lost_reason && <Field label="Motif de perte" value={LOST_REASON_LABELS[quote.lost_reason as LostReason]} />}
                {quote.accepted_at && <Field label="Accepté le" value={formatDate(quote.accepted_at)} />}
                {quote.declined_at && <Field label="Refusé le" value={formatDate(quote.declined_at)} />}
              </dl>
              {quote.description && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap text-sm">{quote.description}</p>
                </div>
              )}
              {quote.notes && (
                <div className="mt-4 rounded-md bg-muted/60 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Notes internes</p>
                  <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <NoteForm quoteId={id} />
              <Timeline events={(activity ?? []).map((a) => ({ ...a, actor_name: a.actor?.full_name ?? null }))} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Link href={`/clients/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                <p className="text-muted-foreground">{[c.company_name, CUSTOMER_TYPE_LABELS[c.customer_type as CustomerType]].filter(Boolean).join(" · ")}</p>
              </div>
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="size-4" /> {c.email}</a>}
              {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" /> {formatPhone(c.phone)}</a>}
              {(c.address_line || c.city) && (
                <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /> {[c.address_line, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
              )}
              {c.do_not_contact && (
                <p className="flex items-center gap-2 rounded-md bg-destructive-soft px-3 py-2 text-destructive"><ShieldOff className="size-4" /> Ne souhaite plus être recontacté</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
            <CardContent><AttachmentsCard quoteId={id} items={attachments ?? []} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Échanges</CardTitle></CardHeader>
            <CardContent>
              {(comms ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun échange enregistré.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {(comms ?? []).map((m) => (
                    <li key={m.id} className="border-l-2 pl-3" style={{ borderColor: m.direction === "inbound" ? "#6B4FA0" : "var(--primary)" }}>
                      <p className="font-medium">
                        {m.kind === "reply" ? "Réponse du client" : m.kind === "followup_sent" ? "Relance envoyée (email)" : "Relance enregistrée"}
                        <span className="font-normal text-muted-foreground"> · {m.channel === "phone" ? "téléphone" : m.channel === "email" ? "email" : "manuel"}</span>
                      </p>
                      {m.summary && <p className="text-muted-foreground">{m.summary}</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.occurred_at)}
                        {m.delivery_status && ` · statut fournisseur : ${m.delivery_status}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 flex gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /> Les réponses ne sont pas détectées automatiquement : utilisez « Le client a répondu ».</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
