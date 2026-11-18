"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { displayStatus, allowedTransitions } from "@/lib/domain/quote-status";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";
import { useQuoteActions } from "./quote-actions";
import { LostReasonDialog } from "./lost-reason-dialog";
import type { QuoteListItem } from "./types";

const COLUMNS: { key: string; label: string; statuses: QuoteStatus[]; accent: string }[] = [
  { key: "draft", label: "Brouillons", statuses: ["draft"], accent: "bg-slate-400" },
  { key: "sent", label: "Envoyés", statuses: ["sent"], accent: "bg-info" },
  { key: "to_follow_up", label: "À relancer", statuses: ["to_follow_up"], accent: "bg-warning" },
  { key: "followed_up", label: "Relancés", statuses: ["followed_up"], accent: "bg-primary" },
  { key: "pending", label: "En attente", statuses: ["pending"], accent: "bg-[#6B4FA0]" },
  { key: "accepted", label: "Acceptés", statuses: ["accepted"], accent: "bg-success" },
  { key: "lost", label: "Perdus", statuses: ["declined", "expired", "cancelled"], accent: "bg-destructive" },
];

export function QuotesKanban({ items }: { items: QuoteListItem[] }) {
  const actions = useQuoteActions();
  const [declineId, setDeclineId] = useState<string | null>(null);
  const now = new Date();
  const withDisplay = items.map((q) => ({ ...q, display: displayStatus(q.status, q.next_followup_at, now) }));

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1180px] grid-cols-7 gap-3">
          {COLUMNS.map((col) => {
            const cards = withDisplay.filter((q) => col.statuses.includes(q.display));
            const total = cards.reduce((s, q) => s + q.amount_ht_cents, 0);
            return (
              <section key={col.key} className="flex min-h-[200px] flex-col rounded-lg bg-muted/60 p-2" aria-label={col.label}>
                <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                  <span className={cn("size-2 rounded-full", col.accent)} />
                  <h2 className="text-sm font-medium">{col.label}</h2>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                  <span className="tabular ml-auto text-xs text-muted-foreground">{formatCents(total, { round: true })}</span>
                </header>
                <div className="flex flex-col gap-2">
                  {cards.map((q) => (
                    <article key={q.id} className="group rounded-md border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/devis/${q.id}`} className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{q.customer?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{q.reference}</p>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 size-7 opacity-60 group-hover:opacity-100" aria-label="Changer le statut">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Déplacer vers</DropdownMenuLabel>
                            {allowedTransitions(q.status)
                              .filter((s) => s !== "to_follow_up" && s !== "followed_up")
                              .map((s) => (
                                <DropdownMenuItem key={s} onSelect={() => (s === "declined" ? setDeclineId(q.id) : actions.changeStatus([q.id], s))}>
                                  {QUOTE_STATUS_LABELS[s]}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Link href={`/devis/${q.id}`} className="mt-1 block">
                        <p className="line-clamp-2 text-xs text-muted-foreground">{q.title}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="tabular text-sm font-semibold">{formatCents(q.amount_ht_cents, { round: true })}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {q.next_followup_at ? `Relance ${formatDate(q.next_followup_at, "d MMM")}` : formatDate(q.sent_at ?? q.issued_on, "d MMM")}
                          </span>
                        </div>
                      </Link>
                    </article>
                  ))}
                  {cards.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Aucun devis</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <LostReasonDialog
        open={!!declineId}
        onOpenChange={(o) => !o && setDeclineId(null)}
        pending={actions.pending}
        onConfirm={(reason, details) => declineId && actions.changeStatus([declineId], "declined", { lostReason: reason, lostReasonDetails: details }, () => setDeclineId(null))}
      />
    </>
  );
}
