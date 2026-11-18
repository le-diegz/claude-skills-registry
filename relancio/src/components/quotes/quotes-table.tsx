"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Copy, MoreHorizontal, PauseCircle, Send, Trash2, XCircle, Ban, PlayCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { formatCents } from "@/lib/domain/money";
import { formatDate, parisDaysBetween } from "@/lib/domain/dates";
import { displayStatus } from "@/lib/domain/quote-status";
import { SERVICE_TYPE_LABELS } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";
import { useUrlParams } from "./quotes-toolbar";
import { useQuoteActions } from "./quote-actions";
import { LostReasonDialog } from "./lost-reason-dialog";
import type { QuoteListItem } from "./types";

function SortHeader({ label, sortKey, align = "left" }: { label: string; sortKey: string; align?: "left" | "right" }) {
  const { params, set } = useUrlParams();
  const [key, dir] = (params.get("tri") ?? "date:desc").split(":");
  const active = key === sortKey;
  const next = active && dir === "desc" ? "asc" : "desc";
  return (
    <button
      type="button"
      onClick={() => set({ tri: `${sortKey}:${next}` }, false)}
      className={cn("-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground", align === "right" && "flex-row-reverse", active && "text-foreground")}
      aria-label={`Trier par ${label}`}
    >
      {label}
      {active ? dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-40" />}
    </button>
  );
}

function nextFollowupLabel(q: QuoteListItem) {
  if (!q.next_followup_at) return q.followups_paused ? "Suspendue" : "—";
  const d = parisDaysBetween(new Date(), q.next_followup_at);
  if (d < 0) return `En retard (${-d} j)`;
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  return formatDate(q.next_followup_at, "d MMM");
}

export function QuotesTable({ items, canDelete }: { items: QuoteListItem[]; canDelete: boolean }) {
  const router = useRouter();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [declineIds, setDeclineIds] = useState<string[] | null>(null);
  const actions = useQuoteActions();
  const now = useMemo(() => new Date(), []);

  const columns = useMemo<ColumnDef<QuoteListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Tout sélectionner"
          />
        ),
        cell: ({ row }) => (
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label={`Sélectionner ${row.original.reference}`} onClick={(e) => e.stopPropagation()} />
        ),
      },
      {
        id: "reference",
        header: () => <SortHeader label="Devis" sortKey="reference" />,
        cell: ({ row }) => (
          <div className="min-w-[220px] max-w-[340px]">
            <Link href={`/devis/${row.original.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {row.original.reference}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{row.original.title}</p>
          </div>
        ),
      },
      {
        id: "client",
        header: () => <span>Client</span>,
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <p className="truncate">{row.original.customer?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{SERVICE_TYPE_LABELS[row.original.service_type]}</p>
          </div>
        ),
      },
      {
        id: "montant",
        header: () => <div className="text-right"><SortHeader label="Montant HT" sortKey="montant" align="right" /></div>,
        cell: ({ row }) => <div className="tabular text-right font-medium">{formatCents(row.original.amount_ht_cents)}</div>,
      },
      {
        id: "statut",
        header: () => <SortHeader label="Statut" sortKey="statut" />,
        cell: ({ row }) => <QuoteStatusBadge status={displayStatus(row.original.status, row.original.next_followup_at, now)} />,
      },
      {
        id: "envoi",
        header: () => <SortHeader label="Envoyé le" sortKey="envoi" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.sent_at, "d MMM yy")}</span>,
      },
      {
        id: "relance",
        header: () => <SortHeader label="Prochaine relance" sortKey="relance" />,
        cell: ({ row }) => {
          const label = nextFollowupLabel(row.original);
          return (
            <span className={cn("whitespace-nowrap text-sm", label.startsWith("En retard") ? "font-medium text-[#A75A04]" : label === "Aujourd'hui" ? "font-medium text-foreground" : "text-muted-foreground")}>
              {label}
              {row.original.followup_count > 0 && <span className="ml-1 text-xs text-muted-foreground">· {row.original.followup_count} faite{row.original.followup_count > 1 ? "s" : ""}</span>}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const q = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions pour ${q.reference}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {q.status === "draft" && (
                  <DropdownMenuItem onSelect={() => actions.changeStatus([q.id], "sent")}><Send /> Marquer comme envoyé</DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => actions.changeStatus([q.id], "accepted")}><CheckCircle2 /> Marquer accepté</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeclineIds([q.id])}><XCircle /> Marquer refusé</DropdownMenuItem>
                {!q.followups_paused ? (
                  <DropdownMenuItem onSelect={() => actions.pause([q.id], true)}><PauseCircle /> Suspendre les relances</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => actions.pause([q.id], false)}><PlayCircle /> Reprendre les relances</DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => actions.duplicate(q.id)}><Copy /> Dupliquer</DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete([q.id])}><Trash2 /> Supprimer</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [actions, canDelete, now],
  );

  const table = useReactTable({
    data: items,
    columns,
    getRowId: (r) => r.id,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });
  const selectedIds = Object.keys(selection).filter((k) => selection[k]);
  const clear = () => setSelection({});

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm" role="toolbar" aria-label="Actions groupées">
          <span className="mr-1 text-sm font-medium">{selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}</span>
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => actions.changeStatus(selectedIds, "accepted", {}, clear)}><CheckCircle2 /> Accepté</Button>
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => setDeclineIds(selectedIds)}><XCircle /> Refusé</Button>
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => actions.changeStatus(selectedIds, "cancelled", {}, clear)}><Ban /> Annulé</Button>
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => actions.pause(selectedIds, true, clear)}><PauseCircle /> Suspendre les relances</Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={`/api/export/devis?ids=${selectedIds.join(",")}`}>Exporter</a>
          </Button>
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(selectedIds)}><Trash2 /> Supprimer</Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={clear}>Désélectionner</Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn("h-10 text-xs font-medium text-muted-foreground", h.id === "select" && "w-10 pl-4", h.id === "actions" && "w-10")}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => router.push(`/devis/${row.original.id}`)}
                data-testid="quote-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn("py-2.5", cell.column.id === "select" && "pl-4")} onClick={cell.column.id === "select" ? (e) => e.stopPropagation() : undefined}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {confirmDelete && confirmDelete.length > 1 ? `${confirmDelete.length} devis` : "ce devis"} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les relances, l&apos;historique et les pièces jointes associés seront supprimés définitivement. Pour conserver une trace, préférez le statut « Annulé ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => confirmDelete && actions.remove(confirmDelete, () => { clear(); setConfirmDelete(null); })}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LostReasonDialog
        open={!!declineIds}
        count={declineIds?.length ?? 1}
        pending={actions.pending}
        onOpenChange={(o) => !o && setDeclineIds(null)}
        onConfirm={(reason, details) => declineIds && actions.changeStatus(declineIds, "declined", { lostReason: reason, lostReasonDetails: details }, () => { clear(); setDeclineIds(null); })}
      />
    </div>
  );
}
