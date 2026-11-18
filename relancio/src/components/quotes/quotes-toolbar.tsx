"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, KanbanSquare, Search, Table2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/domain/constants";

export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return { params, set };
}

export function QuotesToolbar({ members, canExport }: { members: { id: string; name: string }[]; canExport: boolean }) {
  const { params, set } = useUrlParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const view = params.get("vue") === "kanban" ? "kanban" : "table";

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set({ q: q.trim() || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "statut", "type", "responsable", "client"].some((k) => params.get(k));
  const exportHref = `/api/export/devis?${params.toString()}`;

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, chantier, client…" className="bg-card pl-8" aria-label="Rechercher un devis" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={params.get("statut") ?? "tous"} onValueChange={(v) => set({ statut: v === "tous" ? null : v })}>
          <SelectTrigger className="w-[170px] bg-card" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="ouverts">Ouverts</SelectItem>
            <SelectItem value="a_relancer">À relancer</SelectItem>
            <SelectItem value="clos">Clôturés</SelectItem>
            <SelectSeparator />
            {QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.get("type") ?? "tous"} onValueChange={(v) => set({ type: v === "tous" ? null : v })}>
          <SelectTrigger className="w-[170px] bg-card" aria-label="Filtrer par prestation"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes prestations</SelectItem>
            {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{SERVICE_TYPE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {members.length > 1 && (
          <Select value={params.get("responsable") ?? "tous"} onValueChange={(v) => set({ responsable: v === "tous" ? null : v })}>
            <SelectTrigger className="w-[170px] bg-card" aria-label="Filtrer par responsable"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous responsables</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: null, statut: null, type: null, responsable: null, client: null }); }}>
            <X /> Réinitialiser
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 lg:ml-auto">
        {canExport && (
          <Button variant="outline" size="sm" asChild className="bg-card">
            <a href={exportHref}><Download /> Export CSV</a>
          </Button>
        )}
        <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && set({ vue: v === "kanban" ? "kanban" : null }, false)} aria-label="Vue">
          <ToggleGroupItem value="table" aria-label="Vue tableau" className="bg-card"><Table2 /></ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Vue Kanban" className="bg-card"><KanbanSquare /></ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
