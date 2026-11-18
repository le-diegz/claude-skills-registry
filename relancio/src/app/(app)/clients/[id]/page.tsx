import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone, ShieldOff } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { Timeline } from "@/components/app/timeline";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerDanger } from "@/components/customers/customer-danger";
import { AddQuoteButton } from "@/components/quotes/add-quote-button";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { formatPhone, findDuplicateCustomers } from "@/lib/domain/contact";
import { displayStatus } from "@/lib/domain/quote-status";
import { CUSTOMER_TYPE_LABELS, OPEN_STATUSES, type CustomerType, type QuoteStatus } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Client" };

export default async function CustomerPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await requireAppContext();
  const db = ctx.supabase;
  const { data: c } = await db.from("customers").select("*").eq("id", id).eq("organization_id", ctx.organization.id).maybeSingle();
  if (!c) notFound();
  const [{ data: quotes }, { data: activity }, { data: all }] = await Promise.all([
    db.from("quotes").select("id, reference, title, status, amount_ht_cents, issued_on, sent_at, next_followup_at, accepted_at").eq("customer_id", id).order("issued_on", { ascending: false }),
    db.from("activity_events").select("id, type, message, created_at, quote_id, actor:profiles(full_name)").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("customers").select("id, name, email, phone").eq("organization_id", ctx.organization.id).limit(3000),
  ]);
  const list = quotes ?? [];
  const open = list.filter((q) => (OPEN_STATUSES as readonly string[]).includes(q.status));
  const accepted = list.filter((q) => q.status === "accepted");
  const decided = list.filter((q) => ["accepted", "declined", "expired"].includes(q.status));
  const dups = findDuplicateCustomers(c, all ?? [], c.id).map((d) => ({ id: d.customer.id, name: d.customer.name }));
  const refs = new Map(list.map((q) => [q.id, q.reference]));

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Clients</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{c.name}</h1>
          <p className="text-muted-foreground">{[c.company_name, CUSTOMER_TYPE_LABELS[c.customer_type as CustomerType]].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <CustomerFormDialog
            customer={{
              id: c.id,
              name: c.name,
              company_name: c.company_name ?? "",
              email: c.email ?? "",
              phone: c.phone ?? "",
              address_line: c.address_line ?? "",
              postal_code: c.postal_code ?? "",
              city: c.city ?? "",
              customer_type: c.customer_type as CustomerType,
              notes: c.notes ?? "",
              do_not_contact: c.do_not_contact,
            }}
          />
          <AddQuoteButton customerId={c.id} label="Nouveau devis" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="gap-0 py-0">
            <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
              <Stat label="Devis" value={String(list.length)} />
              <Stat label="En cours HT" value={formatCents(open.reduce((s, q) => s + q.amount_ht_cents, 0), { round: true })} />
              <Stat label="Accepté HT" value={formatCents(accepted.reduce((s, q) => s + q.amount_ht_cents, 0), { round: true })} />
              <Stat label="Taux d'acceptation" value={decided.length ? `${Math.round((accepted.length / decided.length) * 100)} %` : "—"} />
            </div>
          </Card>
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-4"><CardTitle className="text-base">Devis</CardTitle></CardHeader>
            {list.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Aucun devis pour ce client.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Devis</TableHead>
                    <TableHead className="text-right text-xs">Montant HT</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="hidden text-xs sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((q) => (
                    <TableRow key={q.id} className="relative">
                      <TableCell>
                        <Link href={`/devis/${q.id}`} className="font-medium after:absolute after:inset-0 hover:underline">{q.reference}</Link>
                        <p className="max-w-[260px] truncate text-xs text-muted-foreground">{q.title}</p>
                      </TableCell>
                      <TableCell className="tabular text-right">{formatCents(q.amount_ht_cents)}</TableCell>
                      <TableCell><QuoteStatusBadge status={displayStatus(q.status as QuoteStatus, q.next_followup_at)} /></TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(q.issued_on)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader>
            <CardContent>
              <Timeline showQuoteLinks events={(activity ?? []).map((a) => ({ ...a, actor_name: a.actor?.full_name ?? null, quote_reference: a.quote_id ? refs.get(a.quote_id) ?? null : null }))} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="size-4" /> {c.email}</a> : <p className="text-muted-foreground">Pas d&apos;email</p>}
              {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="size-4" /> {formatPhone(c.phone)}</a>}
              {(c.address_line || c.city) && <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4" /> {[c.address_line, [c.postal_code, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>}
              {c.do_not_contact && (
                <p className="flex items-center gap-2 rounded-md bg-destructive-soft px-3 py-2 text-destructive">
                  <ShieldOff className="size-4" /> Opposé à être recontacté{c.do_not_contact_at ? ` depuis le ${formatDate(c.do_not_contact_at)}` : ""}
                </p>
              )}
              {c.notes && <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-3">{c.notes}</p>}
              <p className="text-xs text-muted-foreground">Client depuis le {formatDate(c.created_at)}</p>
            </CardContent>
          </Card>
          {can(ctx.role, "customers.delete") && <CustomerDanger id={c.id} name={c.name} duplicates={dups} />}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
