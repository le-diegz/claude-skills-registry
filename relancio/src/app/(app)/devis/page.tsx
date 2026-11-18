import type { Metadata } from "next";
import Link from "next/link";
import { FileText, SearchX, Upload } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { QuotesToolbar } from "@/components/quotes/quotes-toolbar";
import { QuotesTable } from "@/components/quotes/quotes-table";
import { QuotesKanban } from "@/components/quotes/quotes-kanban";
import { QuotesMobileList } from "@/components/quotes/quotes-mobile-list";
import { PaginationBar } from "@/components/app/pagination-bar";
import { AddQuoteButton } from "@/components/quotes/add-quote-button";
import { PAGE_SIZE, buildQuoteQuery, customerIdsMatching, parseQuoteListParams } from "@/lib/queries/quotes";
import type { QuoteListItem } from "@/components/quotes/types";
import { formatCents } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Devis" };

export default async function QuotesPage({ searchParams }: PageProps<"/devis">) {
  const ctx = await requireAppContext();
  const sp = await searchParams;
  const params = parseQuoteListParams(sp);
  const kanban = sp.vue === "kanban";
  if (params.q) params.customerIds = await customerIdsMatching(ctx.supabase, ctx.organization.id, params.q);

  let query = buildQuoteQuery(ctx.supabase, ctx.organization.id, params, { count: true });
  query = kanban ? query.limit(300) : query.range((params.page! - 1) * PAGE_SIZE, params.page! * PAGE_SIZE - 1);

  const [{ data, count, error }, { data: members }, { count: totalAll }] = await Promise.all([
    query,
    ctx.supabase.from("organization_members").select("user_id, profile:profiles(full_name, email)").eq("organization_id", ctx.organization.id),
    ctx.supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organization.id),
  ]);
  if (error) throw new Error(error.message);
  const items = (data ?? []) as unknown as QuoteListItem[];
  const memberList = (members ?? []).map((m) => ({ id: m.user_id, name: m.profile?.full_name || m.profile?.email || "Membre" }));
  const filteredTotal = count ?? 0;
  const pageAmount = items.reduce((s, q) => s + q.amount_ht_cents, 0);

  return (
    <div>
      <PageHeader
        title="Devis"
        description={totalAll ? `${totalAll} devis au total` : "Suivez tous vos devis et leur état de relance."}
        actions={
          <>
            <Button variant="outline" asChild><Link href="/devis/import"><Upload /> Importer</Link></Button>
            <AddQuoteButton />
          </>
        }
      />
      {totalAll === 0 ? (
        <EmptyState icon={FileText} title="Aucun devis" description="Ajoutez votre premier devis ou importez ceux de votre logiciel actuel au format CSV.">
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild><Link href="/devis/import"><Upload /> Importer un CSV</Link></Button>
            <AddQuoteButton />
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <QuotesToolbar members={memberList} canExport={can(ctx.role, "data.export")} />
          {items.length === 0 ? (
            <EmptyState icon={SearchX} title="Aucun devis ne correspond" description="Modifiez la recherche ou les filtres." />
          ) : kanban ? (
            <QuotesKanban items={items} />
          ) : (
            <>
              <div className="hidden md:block">
                <QuotesTable items={items} canDelete={can(ctx.role, "quotes.delete")} />
              </div>
              <div className="md:hidden">
                <QuotesMobileList items={items} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Total de la page : {formatCents(pageAmount)} HT</p>
                <PaginationBar page={params.page!} pageSize={PAGE_SIZE} total={filteredTotal} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
