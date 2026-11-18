import type { QuoteStatus, ServiceType } from "@/lib/domain/constants";

export interface QuoteListItem {
  id: string;
  reference: string;
  title: string;
  status: QuoteStatus;
  service_type: ServiceType;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  issued_on: string;
  sent_at: string | null;
  expires_on: string | null;
  next_followup_at: string | null;
  followup_count: number;
  followups_paused: boolean;
  owner_id: string | null;
  customer: { id: string; name: string; company_name: string | null; email: string | null; phone: string | null; do_not_contact: boolean } | null;
}
