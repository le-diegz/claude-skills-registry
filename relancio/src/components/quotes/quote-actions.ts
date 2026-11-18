"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeQuoteStatusAction, deleteQuotesAction, duplicateQuoteAction, setFollowupsPausedAction } from "@/server/actions/quotes";
import type { LostReason, QuoteStatus } from "@/lib/domain/constants";

/** Actions de devis partagées (liste, Kanban, fiche) avec retours utilisateur. */
export function useQuoteActions() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const changeStatus = (ids: string[], status: QuoteStatus, extra: { lostReason?: LostReason | null; lostReasonDetails?: string | null } = {}, after?: () => void) =>
    start(async () => {
      const res = await changeQuoteStatusAction({ ids, status, ...extra });
      if (!res.ok) return void toast.error(res.error);
      if (res.data.errors.length > 0) toast.warning(`${res.data.updated} mis à jour, ${res.data.errors.length} ignoré(s) : ${res.data.errors[0]}`);
      else toast.success(res.message ?? "Statut mis à jour");
      after?.();
      router.refresh();
    });

  const remove = (ids: string[], after?: () => void) =>
    start(async () => {
      const res = await deleteQuotesAction(ids);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Supprimé");
      after?.();
      router.refresh();
    });

  const duplicate = (id: string) =>
    start(async () => {
      const res = await duplicateQuoteAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Dupliqué");
      router.push(`/devis/${res.data.id}`);
    });

  const pause = (ids: string[], paused: boolean, after?: () => void) =>
    start(async () => {
      const res = await setFollowupsPausedAction(ids, paused);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Mis à jour");
      after?.();
      router.refresh();
    });

  return { pending, changeStatus, remove, duplicate, pause };
}
