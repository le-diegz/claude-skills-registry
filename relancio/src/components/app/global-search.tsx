"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, User, BellRing, LayoutDashboard, Plus, Upload } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { formatCents } from "@/lib/domain/money";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/domain/constants";
import { useQuoteDialog } from "@/components/quotes/quote-dialog-provider";

interface SearchResult {
  quotes: { id: string; reference: string; title: string; status: QuoteStatus; amount_ht_cents: number; customer: string }[];
  customers: { id: string; name: string; company_name: string | null; email: string | null }[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ quotes: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { openCreate } = useQuoteDialog();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping(e))) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* requête annulée */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  const shown = query.trim().length >= 2 ? results : { quotes: [], customers: [] };

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-full justify-start gap-2 bg-background px-3 font-normal text-muted-foreground shadow-none sm:w-64 lg:w-80"
        onClick={() => setOpen(true)}
        aria-label="Rechercher"
      >
        <Search className="size-4" />
        <span className="truncate">Rechercher un devis, un client…</span>
        <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Recherche" description="Rechercher un devis ou un client" shouldFilter={false}>
        <CommandInput placeholder="Référence, client, chantier, email…" value={query} onValueChange={setQuery} />
        <CommandList>
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Spinner /> Recherche…
            </div>
          )}
          {query.trim().length >= 2 && !loading && <CommandEmpty>Aucun résultat pour « {query} »</CommandEmpty>}
          {shown.quotes.length > 0 && (
            <CommandGroup heading="Devis">
              {shown.quotes.map((q) => (
                <CommandItem key={q.id} value={`q-${q.id}`} onSelect={() => go(`/devis/${q.id}`)}>
                  <FileText />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="font-medium">{q.reference}</span> · {q.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {q.customer} · {QUOTE_STATUS_LABELS[q.status]}
                    </div>
                  </div>
                  <span className="tabular text-xs text-muted-foreground">{formatCents(q.amount_ht_cents, { round: true })}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {shown.customers.length > 0 && (
            <CommandGroup heading="Clients">
              {shown.customers.map((c) => (
                <CommandItem key={c.id} value={`c-${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                  <User />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{[c.company_name, c.email].filter(Boolean).join(" · ")}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query.trim().length < 2 && (
            <>
              <CommandGroup heading="Actions rapides">
                <CommandItem
                  value="nouveau devis"
                  onSelect={() => {
                    setOpen(false);
                    openCreate();
                  }}
                >
                  <Plus /> Ajouter un devis
                </CommandItem>
                <CommandItem value="importer" onSelect={() => go("/devis/import")}>
                  <Upload /> Importer des devis (CSV)
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Navigation">
                <CommandItem value="tableau de bord" onSelect={() => go("/tableau-de-bord")}>
                  <LayoutDashboard /> Vue d&apos;ensemble
                </CommandItem>
                <CommandItem value="relances" onSelect={() => go("/relances")}>
                  <BellRing /> Relances à traiter
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.tagName === "SELECT");
}
