"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlParams } from "@/components/quotes/quotes-toolbar";
import { PERIOD_PRESETS } from "@/lib/domain/stats";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/domain/constants";

export function StatsFilters({ members }: { members: { id: string; name: string }[] }) {
  const { params, set } = useUrlParams();
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={params.get("periode") ?? "90j"} onValueChange={(v) => set({ periode: v === "90j" ? null : v })}>
        <SelectTrigger className="w-[180px] bg-card" aria-label="Période"><SelectValue /></SelectTrigger>
        <SelectContent>{PERIOD_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={params.get("responsable") ?? "tous"} onValueChange={(v) => set({ responsable: v === "tous" ? null : v })}>
        <SelectTrigger className="w-[190px] bg-card" aria-label="Collaborateur"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les collaborateurs</SelectItem>
          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={params.get("type") ?? "tous"} onValueChange={(v) => set({ type: v === "tous" ? null : v })}>
        <SelectTrigger className="w-[190px] bg-card" aria-label="Type de prestation"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Toutes prestations</SelectItem>
          {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{SERVICE_TYPE_LABELS[s]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
