"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/domain/dates";
import { listNotificationsAction, markNotificationsReadAction } from "@/server/actions/notifications";

type Item = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationsMenu({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [count, setCount] = useState(unread);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listNotificationsAction().then((res) => {
      if (alive && res.ok) setItems(res.data);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const markAll = () =>
    start(async () => {
      await markNotificationsReadAction("all");
      setItems((prev) => prev?.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })) ?? null);
      setCount(0);
      router.refresh();
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${count ? ` (${count} non lues)` : ""}`}>
          <Bell className="size-[18px]" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll} disabled={count === 0}>
            <CheckCheck className="size-3.5" /> Tout marquer comme lu
          </Button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items === null ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <Link
                    href={n.link ?? "/notifications"}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read_at) {
                        setCount((c) => Math.max(0, c - 1));
                        void markNotificationsReadAction([n.id]);
                      }
                    }}
                    className={cn("flex gap-3 px-4 py-3 text-sm hover:bg-muted/60", !n.read_at && "bg-primary-soft/40")}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{n.title}</span>
                      {n.body && <span className="line-clamp-2 block text-muted-foreground">{n.body}</span>}
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">Voir toutes les notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
