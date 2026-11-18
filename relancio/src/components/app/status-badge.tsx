import { cn } from "@/lib/utils";
import {
  FOLLOWUP_JOB_STATUS_LABELS,
  QUOTE_STATUS_DESCRIPTIONS,
  QUOTE_STATUS_LABELS,
  type FollowupJobStatus,
  type QuoteStatus,
} from "@/lib/domain/constants";

const QUOTE_STYLES: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground ring-border",
  sent: "bg-info-soft text-info ring-info/20",
  pending: "bg-[#F3EEFB] text-[#6B4FA0] ring-[#6B4FA0]/20",
  to_follow_up: "bg-warning-soft text-[#A75A04] ring-warning/25",
  followed_up: "bg-primary-soft text-primary ring-primary/20",
  accepted: "bg-success-soft text-success ring-success/25",
  declined: "bg-destructive-soft text-destructive ring-destructive/20",
  expired: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-muted text-muted-foreground ring-border line-through decoration-muted-foreground/40",
};

const DOT: Record<QuoteStatus, string> = {
  draft: "bg-slate-400",
  sent: "bg-info",
  pending: "bg-[#6B4FA0]",
  to_follow_up: "bg-warning",
  followed_up: "bg-primary",
  accepted: "bg-success",
  declined: "bg-destructive",
  expired: "bg-slate-400",
  cancelled: "bg-slate-300",
};

export function QuoteStatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <span
      title={QUOTE_STATUS_DESCRIPTIONS[status]}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        QUOTE_STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

const JOB_STYLES: Record<FollowupJobStatus, string> = {
  scheduled: "bg-muted text-muted-foreground ring-border",
  to_prepare: "bg-warning-soft text-[#A75A04] ring-warning/25",
  pending_approval: "bg-warning-soft text-[#A75A04] ring-warning/25",
  approved: "bg-primary-soft text-primary ring-primary/20",
  sending: "bg-info-soft text-info ring-info/20",
  sent: "bg-success-soft text-success ring-success/25",
  failed: "bg-destructive-soft text-destructive ring-destructive/20",
  cancelled: "bg-muted text-muted-foreground ring-border",
  skipped: "bg-muted text-muted-foreground ring-border",
};

export function JobStatusBadge({ status, className }: { status: FollowupJobStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        JOB_STYLES[status],
        className,
      )}
    >
      {FOLLOWUP_JOB_STATUS_LABELS[status]}
    </span>
  );
}
