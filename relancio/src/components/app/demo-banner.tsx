"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { resetDemoAction } from "@/server/actions/demo";

export function DemoBanner() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div role="status" className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-[#7A4303] sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <FlaskConical className="size-4 shrink-0" />
        <span className="truncate font-medium">Démonstration — données fictives</span>
        <span className="hidden text-[#7A4303]/80 md:inline">Aucun email réel n&apos;est envoyé depuis cet espace.</span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 shrink-0 text-[#7A4303] hover:bg-warning/15" disabled={pending}>
            <RotateCcw className="size-3.5" />
            Réinitialiser
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser la démonstration ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les modifications faites dans cet espace de démonstration seront effacées et les données fictives régénérées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const res = await resetDemoAction();
                  if (res.ok) {
                    toast.success("Démonstration réinitialisée");
                    router.refresh();
                  } else toast.error(res.error);
                })
              }
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
