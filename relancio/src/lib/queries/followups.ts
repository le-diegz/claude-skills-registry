import "server-only";
import type { Db } from "@/lib/db";
import type { FollowupItem, TemplateOption } from "@/components/followups/types";
import { buildTemplateValues } from "@/lib/domain/templates";
import type { FollowupJobStatus, QuoteStatus, TemplateKind } from "@/lib/domain/constants";
import { isEmailProviderConfigured } from "@/lib/env";

const SELECT =
  "id, sequence, status, channel, scheduled_for, subject, body, recipient_email, last_error, approved_at, sent_at, quote:quotes!inner(id, reference, title, amount_ht_cents, amount_ttc_cents, status, sent_at, issued_on, expires_on, followup_count, owner_id, customer:customers(id, name, email, phone, company_name))";

export async function loadFollowupItems(
  db: Db,
  organization: { id: string; name: string },
  options: { statuses: FollowupJobStatus[]; quoteId?: string; limit?: number; order?: "asc" | "desc"; orderBy?: "scheduled_for" | "sent_at" | "updated_at" },
): Promise<FollowupItem[]> {
  let q = db
    .from("followup_jobs")
    .select(SELECT)
    .eq("organization_id", organization.id)
    .in("status", options.statuses)
    .order(options.orderBy ?? "scheduled_for", { ascending: (options.order ?? "asc") === "asc", nullsFirst: false })
    .limit(options.limit ?? 200);
  if (options.quoteId) q = q.eq("quote_id", options.quoteId);
  const { data } = await q;
  return (data ?? [])
    .filter((j) => j.quote && j.quote.customer)
    .map((j) => ({
      id: j.id,
      sequence: j.sequence,
      status: j.status as FollowupJobStatus,
      channel: j.channel,
      scheduled_for: j.scheduled_for,
      subject: j.subject,
      body: j.body,
      recipient_email: j.recipient_email,
      last_error: j.last_error,
      approved_at: j.approved_at,
      sent_at: j.sent_at,
      quote: {
        id: j.quote.id,
        reference: j.quote.reference,
        title: j.quote.title,
        amount_ht_cents: j.quote.amount_ht_cents,
        amount_ttc_cents: j.quote.amount_ttc_cents,
        status: j.quote.status as QuoteStatus,
        sent_at: j.quote.sent_at,
        followup_count: j.quote.followup_count,
      },
      customer: j.quote.customer!,
      templateValues: buildTemplateValues({ customer: j.quote.customer!, organization, quote: j.quote }),
    }));
}

export async function loadTemplateOptions(db: Db, organizationId: string): Promise<TemplateOption[]> {
  const { data } = await db
    .from("followup_templates")
    .select("id, kind, name, subject, body")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at");
  return (data ?? []).map((t) => ({ ...t, kind: t.kind as TemplateKind }));
}

export async function isEmailSendingEnabled(db: Db, organizationId: string): Promise<boolean> {
  if (!isEmailProviderConfigured()) return false;
  const { data } = await db.from("integrations").select("enabled").eq("organization_id", organizationId).eq("provider", "resend").maybeSingle();
  return Boolean(data?.enabled);
}
