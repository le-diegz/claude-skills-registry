"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAccountAction, deleteOrganizationAction } from "@/server/actions/settings";

function ConfirmDelete({ label, expected, help, onConfirm }: { label: string; expected: string; help: string; onConfirm: (v: string) => Promise<{ ok: boolean; error?: string } | void> }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive">{label}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{help} Saisissez <span className="font-medium text-foreground">{expected}</span> pour confirmer.</AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Confirmation" />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || value.trim() !== expected}
            onClick={() => start(async () => { const r = await onConfirm(value); if (r && !r.ok) toast.error(r.error); })}
          >
            Supprimer définitivement
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DangerZone({ orgName, email, isOwner }: { orgName: string; email: string; isOwner: boolean }) {
  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Supprimer l&apos;entreprise</p>
            <p className="text-sm text-muted-foreground">Devis, clients, relances, documents et historique de toute l&apos;équipe.</p>
          </div>
          <ConfirmDelete label="Supprimer l'entreprise" expected={orgName} help="Toutes les données de l'entreprise seront effacées." onConfirm={(v) => deleteOrganizationAction(v)} />
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-md border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Supprimer mon compte</p>
          <p className="text-sm text-muted-foreground">Supprime votre accès. Si vous êtes seul dans l&apos;entreprise, ses données sont aussi supprimées.</p>
        </div>
        <ConfirmDelete label="Supprimer mon compte" expected={email} help="Cette action est irréversible." onConfirm={(v) => deleteAccountAction(v)} />
      </div>
    </div>
  );
}
