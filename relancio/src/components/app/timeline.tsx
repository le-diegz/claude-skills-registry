import Link from "next/link";
import { Activity, BellRing, CheckCircle2, FileText, MessageSquareReply, Pencil, StickyNote, Upload, XCircle, PauseCircle, UserRound, Paperclip } from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Activity> = {
  quote_created: FileText,
  quote_updated: Pencil,
  quote_imported: Upload,
  quote_duplicated: FileText,
  quote_status_changed: Activity,
  quote_accepted: CheckCircle2,
  quote_declined: XCircle,
  followup_scheduled: BellRing,
  followup_prepared: BellRing,
  followup_approved: CheckCircle2,
  followup_sent: BellRing,
  followup_failed: XCircle,
  followup_skipped: BellRing,
  followup_snoozed: BellRing,
  followups_paused: PauseCircle,
  followups_resumed: BellRing,
  reply_recorded: MessageSquareReply,
  note_added: StickyNote,
  attachment_added: Paperclip,
  attachment_removed: Paperclip,
  customer_created: UserRound,
  customer_updated: UserRound,
  customer_opt_out: PauseCircle,
  import_completed: Upload,
};

const TONE: Record<string, string> = {
  quote_accepted: "bg-success-soft text-success",
  quote_declined: "bg-destructive-soft text-destructive",
  followup_failed: "bg-destructive-soft text-destructive",
  followup_sent: "bg-primary-soft text-primary",
  reply_recorded: "bg-[#F3EEFB] text-[#6B4FA0]",
  note_added: "bg-warning-soft text-[#A75A04]",
};

export interface TimelineEvent {
  id: string;
  type: string;
  message: string;
  created_at: string;
  quote_id?: string | null;
  quote_reference?: string | null;
  actor_name?: string | null;
}

export function Timeline({ events, showQuoteLinks = false }: { events: TimelineEvent[]; showQuoteLinks?: boolean }) {
  if (events.length === 0) return <p className="py-6 text-sm text-muted-foreground">Aucun événement.</p>;
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => {
        const Icon = ICONS[e.type] ?? Activity;
        return (
          <li key={e.id} className="relative flex gap-3 pb-4">
            {i < events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border" aria-hidden />}
            <span className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", TONE[e.type])}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn("text-sm", e.type === "note_added" && "whitespace-pre-wrap rounded-md bg-muted/60 px-3 py-2")}>
                {e.type === "note_added" && <span className="mb-0.5 block text-xs font-medium text-muted-foreground">Note</span>}
                {e.message}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground" title={formatDateTime(e.created_at)}>
                {formatRelative(e.created_at)}
                {e.actor_name ? ` · ${e.actor_name}` : ""}
                {showQuoteLinks && e.quote_id && (
                  <>
                    {" · "}
                    <Link href={`/devis/${e.quote_id}`} className="hover:text-foreground hover:underline">{e.quote_reference ?? "Voir le devis"}</Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
