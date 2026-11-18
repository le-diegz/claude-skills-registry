"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GitMerge, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCustomerAction, mergeCustomersAction } from "@/server/actions/customers";

export function CustomerDanger({ id, name, duplicates }: { id: string; name: string; duplicates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState(duplicates[0]?.id ?? "");
  return (
    <div className="flex flex-wrap gap-2">
      {duplicates.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-[#7A4303]">
          <span className="font-medium">Doublon probable :</span>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger size="sm" className="w-48 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{duplicates.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="bg-card"
            disabled={pending || !target}
            onClick={() =>
              start(async () => {
                const res = await mergeCustomersAction(id, target);
                if (!res.ok) return void toast.error(res.error);
                toast.success(`Fusionné dans ${name}`);
                router.refresh();
              })
            }
          >
            <GitMerge /> Fusionner dans cette fiche
          </Button>
        </div>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Supprimer le client</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {name} ?</AlertDialogTitle>
            <AlertDialogDescription>Possible uniquement si le client n&apos;a aucun devis. Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() =>
                start(async () => {
                  const res = await deleteCustomerAction(id);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Client supprimé");
                  router.push("/clients");
                })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
