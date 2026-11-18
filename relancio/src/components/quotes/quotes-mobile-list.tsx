import Link from "next/link";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { displayStatus } from "@/lib/domain/quote-status";
import type { QuoteListItem } from "./types";

/** Liste en cartes pour mobile : lisible d'une main, sur le terrain. */
export function QuotesMobileList({ items }: { items: QuoteListItem[] }) {
  const now = new Date();
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {items.map((q) => (
        <li key={q.id}>
          <Link href={`/devis/${q.id}`} className="flex flex-col gap-1.5 px-4 py-3 active:bg-muted/60">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{q.customer?.name}</span>
              <span className="tabular shrink-0 font-medium">{formatCents(q.amount_ht_cents, { round: true })}</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">{q.reference} · {q.title}</p>
            <div className="flex items-center justify-between">
              <QuoteStatusBadge status={displayStatus(q.status, q.next_followup_at, now)} />
              <span className="text-xs text-muted-foreground">
                {q.next_followup_at ? `Relance ${formatDate(q.next_followup_at, "d MMM")}` : formatDate(q.sent_at ?? q.issued_on, "d MMM yy")}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
