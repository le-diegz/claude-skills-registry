"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction, markNotificationUnreadAction } from "@/server/actions/notifications";

export function NotificationsActions({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button variant="outline" disabled={disabled || pending} onClick={() => start(async () => { await markNotificationsReadAction("all"); router.refresh(); })}>
      <CheckCheck /> Tout marquer comme lu
    </Button>
  );
}

export function NotificationToggle({ id, read }: { id: string; read: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 text-xs"
      disabled={pending}
      onClick={() => start(async () => { if (read) await markNotificationUnreadAction(id); else await markNotificationsReadAction([id]); router.refresh(); })}
    >
      {read ? "Marquer non lue" : "Marquer lue"}
    </Button>
  );
}
