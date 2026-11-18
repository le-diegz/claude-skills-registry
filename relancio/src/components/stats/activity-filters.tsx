"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlParams } from "@/components/quotes/quotes-toolbar";

export function ActivityFilters({ members }: { members: { id: string; name: string }[] }) {
  const { params, set } = useUrlParams();
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={params.get("type") ?? "tous"} onValueChange={(v) => set({ type: v === "tous" ? null : v })}>
        <SelectTrigger className="w-[190px] bg-card" aria-label="Type d'événement"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les événements</SelectItem>
          <SelectItem value="devis">Devis</SelectItem>
          <SelectItem value="relances">Relances</SelectItem>
          <SelectItem value="reponses">Réponses clients</SelectItem>
          <SelectItem value="clients">Clients</SelectItem>
          <SelectItem value="imports">Imports</SelectItem>
        </SelectContent>
      </Select>
      {members.length > 1 && (
        <Select value={params.get("membre") ?? "tous"} onValueChange={(v) => set({ membre: v === "tous" ? null : v })}>
          <SelectTrigger className="w-[190px] bg-card" aria-label="Collaborateur"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les collaborateurs</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
