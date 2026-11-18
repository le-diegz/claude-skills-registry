"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlParams } from "@/components/quotes/quotes-toolbar";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS } from "@/lib/domain/constants";

export function CustomersSearch() {
  const { params, set } = useUrlParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => (params.get("q") ?? "") !== q && set({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, entreprise, email, téléphone…" className="bg-card pl-8" aria-label="Rechercher un client" />
      </div>
      <Select value={params.get("type") ?? "tous"} onValueChange={(v) => set({ type: v === "tous" ? null : v })}>
        <SelectTrigger className="w-full bg-card sm:w-[180px]" aria-label="Type de client"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les types</SelectItem>
          {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
