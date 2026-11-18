import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { NotificationsActions, NotificationToggle } from "@/components/stats/notifications-actions";
import { formatDateTime } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireAppContext();
  const { data } = await ctx.supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at, type")
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description={unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est lu"} actions={<NotificationsActions disabled={unread === 0} />} />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vous serez notifié des relances à valider, imports terminés et échecs d'envoi." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {(data ?? []).map((n) => (
            <li key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.read_at && "bg-primary-soft/40")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-border" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                {n.link ? <Link href={n.link} className="font-medium hover:underline">{n.title}</Link> : <p className="font-medium">{n.title}</p>}
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              <NotificationToggle id={n.id} read={!!n.read_at} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
