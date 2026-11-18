"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Check, ChevronRight, Mail, Phone, SkipForward, TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JobStatusBadge } from "@/components/app/status-badge";
import { formatCents } from "@/lib/domain/money";
import { addDaysToDateOnly, formatDate, formatDateTime, todayParis } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";
import { approveFollowupsAction, markFollowupsSentAction, skipFollowupsAction, snoozeFollowupsAction } from "@/server/actions/followups";
import { FollowupReviewSheet } from "./followup-review-sheet";
import { dueLabel } from "./followup-list";
import type { FollowupItem, TemplateOption } from "./types";

export function FollowupCenter({
  items,
  templates,
  emailEnabled,
  isDemo,
  selectable,
  mode,
}: {
  items: FollowupItem[];
  templates: TemplateOption[];
  emailEnabled: boolean;
  isDemo: boolean;
  selectable: boolean;
  mode: "actionable" | "scheduled" | "history";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [date, setDate] = useState(addDaysToDateOnly(todayParis(), 3));
  const [pending, start] = useTransition();
  const current = items.find((i) => i.id === openId) ?? null;
  const allSelected = selected.length > 0 && selected.length === items.length;

  const bulk = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Fait");
      setSelected([]);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {selectable && selected.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm" role="toolbar" aria-label="Actions groupées">
          <span className="mr-1 text-sm font-medium">{selected.length} sélectionnée{selected.length > 1 ? "s" : ""}</span>
          {mode === "actionable" && (
            <>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk(() => approveFollowupsAction(selected))}><Check /> Valider</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk(() => markFollowupsSentAction(selected))}><Check /> Marquer envoyées</Button>
            </>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending}><CalendarClock /> Reporter</Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 space-y-2">
              <Input type="date" value={date} min={addDaysToDateOnly(todayParis(), 1)} onChange={(e) => setDate(e.target.value)} aria-label="Nouvelle date" />
              <Button size="sm" className="w-full" onClick={() => bulk(() => snoozeFollowupsAction(selected, date))}>Reporter au {formatDate(date, "d MMM")}</Button>
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk(() => skipFollowupsAction(selected))}><SkipForward /> Ignorer</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])}>Désélectionner</Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        {selectable && (
          <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground sm:px-5">
            <Checkbox checked={allSelected ? true : selected.length > 0 ? "indeterminate" : false} onCheckedChange={(v) => setSelected(v ? items.map((i) => i.id) : [])} aria-label="Tout sélectionner" />
            <span>{items.length} relance{items.length > 1 ? "s" : ""}</span>
          </div>
        )}
        <ul className="divide-y">
          {items.map((item) => {
            const due = dueLabel(item.scheduled_for);
            const checked = selected.includes(item.id);
            return (
              <li key={item.id} className={cn("flex items-center gap-3 px-4 sm:px-5", checked && "bg-primary-soft/40")}>
                {selectable && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setSelected((s) => (v ? [...s, item.id] : s.filter((x) => x !== item.id)))}
                    aria-label={`Sélectionner la relance de ${item.customer.name}`}
                  />
                )}
                <button type="button" onClick={() => setOpenId(item.id)} className="group flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-visible:outline-none" data-testid="followup-row">
                  <span className={cn("hidden size-8 shrink-0 items-center justify-center rounded-full sm:flex", item.status === "failed" ? "bg-destructive-soft text-destructive" : "bg-primary-soft text-primary")}>
                    {item.status === "failed" ? <TriangleAlert className="size-4" /> : item.recipient_email || item.customer.email ? <Mail className="size-4" /> : <Phone className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium group-hover:underline">{item.customer.name}</span>
                      <JobStatusBadge status={item.status} className="hidden sm:inline-flex" />
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {item.quote.reference} · Relance n°{item.sequence} · {item.quote.title}
                    </span>
                  </span>
                  <span className="tabular hidden text-sm font-medium sm:block">{formatCents(item.quote.amount_ht_cents, { round: true })}</span>
                  <span className={cn("w-[110px] text-right text-xs", mode === "actionable" && due.late ? "font-medium text-[#A75A04]" : "text-muted-foreground")}>
                    {mode === "history"
                      ? item.sent_at ? formatDateTime(item.sent_at) : formatDate(item.scheduled_for)
                      : mode === "scheduled"
                        ? formatDateTime(item.scheduled_for)
                        : due.label}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <FollowupReviewSheet key={current ? `${current.id}-${current.status}-${current.subject ?? ''}` : "none"} item={current} open={!!current} onOpenChange={(o) => !o && setOpenId(null)} templates={templates} emailEnabled={emailEnabled} isDemo={isDemo} />
      {mode === "actionable" && !emailEnabled && !isDemo && (
        <p className="text-xs text-muted-foreground">
          Mode manuel : copiez le message, envoyez-le depuis votre messagerie, puis « Marquer comme envoyé ».{" "}
          <Link href="/parametres/email" className="text-primary hover:underline">Activer l&apos;envoi direct</Link>
        </p>
      )}
    </div>
  );
}
