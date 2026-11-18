import type { Metadata } from "next";
import Link from "next/link";
import { Users, SearchX, ShieldOff } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersSearch } from "@/components/customers/customers-search";
import { PaginationBar } from "@/components/app/pagination-bar";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, OPEN_STATUSES, type CustomerType } from "@/lib/domain/constants";
import { formatCents } from "@/lib/domain/money";
import { formatPhone, findDuplicateCustomers } from "@/lib/domain/contact";

export const metadata: Metadata = { title: "Clients" };
const PAGE = 30;

export default async function CustomersPage({ searchParams }: PageProps<"/clients">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%_,()\\*]/g, " ").trim().slice(0, 80) : "";
  const type = typeof sp.type === "string" && (CUSTOMER_TYPES as readonly string[]).includes(sp.type) ? (sp.type as CustomerType) : null;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  let query = ctx.supabase
    .from("customers")
    .select("id, name, company_name, email, phone, city, customer_type, do_not_contact", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("name")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`);
  if (type) query = query.eq("customer_type", type);
  const [{ data: customers, count }, { count: total }, { data: allLight }] = await Promise.all([
    query,
    ctx.supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organization.id),
    ctx.supabase.from("customers").select("id, name, email, phone").eq("organization_id", ctx.organization.id).limit(3000),
  ]);
  const ids = (customers ?? []).map((c) => c.id);
  const { data: quotes } = ids.length
    ? await ctx.supabase.from("quotes").select("customer_id, status, amount_ht_cents").in("customer_id", ids)
    : { data: [] as { customer_id: string; status: string; amount_ht_cents: number }[] };
  const agg = new Map<string, { count: number; open: number; accepted: number }>();
  for (const qq of quotes ?? []) {
    const a = agg.get(qq.customer_id) ?? { count: 0, open: 0, accepted: 0 };
    a.count++;
    if ((OPEN_STATUSES as readonly string[]).includes(qq.status)) a.open += qq.amount_ht_cents;
    if (qq.status === "accepted") a.accepted += qq.amount_ht_cents;
    agg.set(qq.customer_id, a);
  }
  // Détection de doublons sur la page affichée
  const dupIds = new Set<string>();
  for (const c of customers ?? []) if (findDuplicateCustomers(c, allLight ?? [], c.id).length > 0) dupIds.add(c.id);

  return (
    <div>
      <PageHeader title="Clients" description={total ? `${total} client${total > 1 ? "s" : ""}` : undefined} actions={<CustomerFormDialog />} />
      {!total ? (
        <EmptyState icon={Users} title="Aucun client" description="Les clients sont créés automatiquement avec vos devis (saisie ou import CSV), ou manuellement ici." />
      ) : (
        <div className="space-y-4">
          <CustomersSearch />
          {(customers ?? []).length === 0 ? (
            <EmptyState icon={SearchX} title="Aucun client ne correspond" />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs">Client</TableHead>
                      <TableHead className="hidden text-xs md:table-cell">Contact</TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">Type</TableHead>
                      <TableHead className="text-right text-xs">Devis</TableHead>
                      <TableHead className="hidden text-right text-xs sm:table-cell">En cours HT</TableHead>
                      <TableHead className="hidden text-right text-xs sm:table-cell">Accepté HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customers ?? []).map((c) => {
                      const a = agg.get(c.id) ?? { count: 0, open: 0, accepted: 0 };
                      return (
                        <TableRow key={c.id} className="relative">
                          <TableCell className="py-2.5">
                            <Link href={`/clients/${c.id}`} className="font-medium after:absolute after:inset-0 hover:underline">{c.name}</Link>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {[c.company_name, c.city].filter(Boolean).join(" · ")}
                              {c.do_not_contact && <span className="inline-flex items-center gap-0.5 text-destructive"><ShieldOff className="size-3" /> Opposé</span>}
                              {dupIds.has(c.id) && <span className="rounded bg-warning-soft px-1 text-[#A75A04]">Doublon ?</span>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            <div className="truncate">{c.email}</div>
                            <div>{formatPhone(c.phone)}</div>
                          </TableCell>
                          <TableCell className="hidden text-sm lg:table-cell">{CUSTOMER_TYPE_LABELS[c.customer_type as CustomerType]}</TableCell>
                          <TableCell className="tabular text-right">{a.count}</TableCell>
                          <TableCell className="tabular hidden text-right sm:table-cell">{a.open ? formatCents(a.open, { round: true }) : "—"}</TableCell>
                          <TableCell className="tabular hidden text-right sm:table-cell">{a.accepted ? formatCents(a.accepted, { round: true }) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar page={page} pageSize={PAGE} total={count ?? 0} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
