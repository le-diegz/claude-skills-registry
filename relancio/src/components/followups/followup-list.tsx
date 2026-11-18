"use client";

import { useState } from "react";
import { ChevronRight, Mail, Phone, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/domain/money";
import { formatDate, parisDaysBetween } from "@/lib/domain/dates";
import { JobStatusBadge } from "@/components/app/status-badge";
import { FollowupReviewSheet } from "./followup-review-sheet";
import type { FollowupItem, TemplateOption } from "./types";

export function dueLabel(scheduledFor: string, now = new Date()) {
  const days = parisDaysBetween(scheduledFor, now);
  if (days <= 0) return { label: "Aujourd'hui", late: false };
  if (days === 1) return { label: "En retard d'1 jour", late: true };
  return { label: `En retard de ${days} jours`, late: true };
}

/** Liste compacte de relances à traiter, ouvrant le panneau de validation. */
export function FollowupList({
  items,
  templates,
  emailEnabled,
  isDemo,
  compact = false,
}: {
  items: FollowupItem[];
  templates: TemplateOption[];
  emailEnabled: boolean;
  isDemo: boolean;
  compact?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const current = items.find((i) => i.id === openId) ?? null;
  return (
    <>
      <ul className="divide-y">
        {items.map((item) => {
          const due = dueLabel(item.scheduled_for);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5"
                data-testid="followup-row"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", item.status === "failed" ? "bg-destructive-soft text-destructive" : "bg-primary-soft text-primary")}>
                  {item.status === "failed" ? <TriangleAlert className="size-4" /> : item.recipient_email ? <Mail className="size-4" /> : <Phone className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.customer.name}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{item.quote.reference}</span>
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    Relance n°{item.sequence} · {item.quote.title}
                  </span>
                </span>
                <span className="hidden flex-col items-end gap-1 sm:flex">
                  <span className="tabular text-sm font-medium">{formatCents(item.quote.amount_ht_cents, { round: true })}</span>
                  {!compact && <JobStatusBadge status={item.status} />}
                </span>
                <span className={cn("w-[92px] text-right text-xs", due.late ? "font-medium text-[#A75A04]" : "text-muted-foreground")}>
                  {item.status === "scheduled" ? formatDate(item.scheduled_for, "d MMM") : due.label}
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          );
        })}
      </ul>
      <FollowupReviewSheet
        key={current ? `${current.id}-${current.status}-${current.subject ?? ""}` : "none"}
        item={current}
        open={!!current}
        onOpenChange={(o) => !o && setOpenId(null)}
        templates={templates}
        emailEnabled={emailEnabled}
        isDemo={isDemo}
      />
    </>
  );
}
