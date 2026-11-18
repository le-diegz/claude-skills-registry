import type { FollowupJobStatus, QuoteStatus, TemplateKind } from "@/lib/domain/constants";
import type { TemplateValues } from "@/lib/domain/templates";

export interface FollowupItem {
  id: string;
  sequence: number;
  status: FollowupJobStatus;
  channel: string;
  scheduled_for: string;
  subject: string | null;
  body: string | null;
  recipient_email: string | null;
  last_error: string | null;
  approved_at: string | null;
  sent_at: string | null;
  quote: {
    id: string;
    reference: string;
    title: string;
    amount_ht_cents: number;
    amount_ttc_cents: number;
    status: QuoteStatus;
    sent_at: string | null;
    followup_count: number;
  };
  customer: { id: string; name: string; email: string | null; phone: string | null; company_name: string | null };
  templateValues: TemplateValues;
}

export interface TemplateOption {
  id: string;
  kind: TemplateKind;
  name: string;
  subject: string;
  body: string;
}
