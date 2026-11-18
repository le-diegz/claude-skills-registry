"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/components/quotes/quotes-toolbar";

export function PaginationBar({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const { set } = useUrlParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {from}–{to} sur {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="bg-card" disabled={page <= 1} onClick={() => set({ page: String(page - 1) }, false)} aria-label="Page précédente">
          <ChevronLeft /> Précédent
        </Button>
        <span className="px-2">Page {page} / {pages}</span>
        <Button variant="outline" size="sm" className="bg-card" disabled={page >= pages} onClick={() => set({ page: String(page + 1) }, false)} aria-label="Page suivante">
          Suivant <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
