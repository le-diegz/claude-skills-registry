"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, MessageSquareReply, MoreHorizontal, Pencil, PauseCircle, PlayCircle, Send, Trash2, XCircle, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { recordReplyAction } from "@/server/actions/quotes";
import { useQuoteActions } from "./quote-actions";
import { useQuoteDialog } from "./quote-dialog-provider";
import { LostReasonDialog } from "./lost-reason-dialog";
import type { QuoteFormInitial } from "./quote-form-dialog";
import type { QuoteStatus } from "@/lib/domain/constants";
import { canTransition } from "@/lib/domain/quote-status";

export function QuoteDetailActions({
  quoteId,
  status,
  paused,
  canDelete,
  formInitial,
}: {
  quoteId: string;
  status: QuoteStatus;
  paused: boolean;
  canDelete: boolean;
  formInitial: QuoteFormInitial;
}) {
  const actions = useQuoteActions();
  const { openEdit } = useQuoteDialog();
  const router = useRouter();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [channel, setChannel] = useState<"phone" | "email" | "other">("phone");
  const [summary, setSummary] = useState("");
  const [pending, start] = useTransition();
  const open = ["sent", "to_follow_up", "followed_up", "pending"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <Button onClick={() => actions.changeStatus([quoteId], "sent")} disabled={actions.pending}><Send /> Marquer comme envoyé</Button>
      )}
      {open && (
        <>
          <Button onClick={() => actions.changeStatus([quoteId], "accepted")} disabled={actions.pending} data-testid="mark-accepted">
            <CheckCircle2 /> Accepté
          </Button>
          <Button variant="outline" onClick={() => setDeclineOpen(true)} disabled={actions.pending}><XCircle /> Refusé</Button>
          {status !== "pending" && (
            <Button variant="outline" onClick={() => setReplyOpen(true)}><MessageSquareReply /> Le client a répondu</Button>
          )}
        </>
      )}
      <Button variant="outline" onClick={() => openEdit(quoteId, formInitial)}><Pencil /> Modifier</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Plus d'actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {status === "pending" && (
            <DropdownMenuItem onSelect={() => actions.changeStatus([quoteId], "sent")}><RotateCcw /> Reprendre les relances</DropdownMenuItem>
          )}
          {["sent", "to_follow_up", "followed_up"].includes(status) &&
            (paused ? (
              <DropdownMenuItem onSelect={() => actions.pause([quoteId], false)}><PlayCircle /> Reprendre les relances</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => actions.pause([quoteId], true)}><PauseCircle /> Suspendre les relances</DropdownMenuItem>
            ))}
          {canTransition(status, "cancelled") && status !== "cancelled" && (
            <DropdownMenuItem onSelect={() => actions.changeStatus([quoteId], "cancelled")}><Ban /> Annuler le devis</DropdownMenuItem>
          )}
          {(status === "accepted" || status === "declined" || status === "expired") && (
            <DropdownMenuItem onSelect={() => actions.changeStatus([quoteId], "pending")}><RotateCcw /> Rouvrir (en attente)</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => actions.duplicate(quoteId)}><Copy /> Dupliquer</DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 /> Supprimer</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <LostReasonDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        pending={actions.pending}
        onConfirm={(reason, details) => actions.changeStatus([quoteId], "declined", { lostReason: reason, lostReasonDetails: details }, () => setDeclineOpen(false))}
      />

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Le client a répondu</DialogTitle>
            <DialogDescription>Le devis passe « En attente » et les relances sont suspendues jusqu&apos;à nouvel ordre.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <ToggleGroup type="single" variant="outline" value={channel} onValueChange={(v) => v && setChannel(v as typeof channel)} className="w-full">
                <ToggleGroupItem value="phone" className="flex-1">Téléphone</ToggleGroupItem>
                <ToggleGroupItem value="email" className="flex-1">Email</ToggleGroupItem>
                <ToggleGroupItem value="other" className="flex-1">Autre</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-summary">Résumé (facultatif)</Label>
              <Textarea id="reply-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ex. : souhaite un rendez-vous pour valider l'emplacement de l'unité extérieure." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Annuler</Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await recordReplyAction({ quoteId, channel, summary: summary.trim() || null });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message ?? "Réponse enregistrée");
                  setReplyOpen(false);
                  setSummary("");
                  router.refresh();
                })
              }
            >
              Enregistrer la réponse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>Relances, historique et documents seront supprimés définitivement. Préférez « Annuler le devis » pour garder une trace.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => actions.remove([quoteId], () => router.push("/devis"))}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
