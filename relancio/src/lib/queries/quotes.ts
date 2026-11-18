import "server-only";
import type { Db } from "@/lib/db";
import { QUOTE_STATUSES, SERVICE_TYPES, type QuoteStatus } from "@/lib/domain/constants";

export const PAGE_SIZE = 25;

export const SORTABLE = {
  reference: "reference",
  client: "customer_id",
  montant: "amount_ht_cents",
  date: "issued_on",
  envoi: "sent_at",
  relance: "next_followup_at",
  statut: "status",
} as const;
export type SortKey = keyof typeof SORTABLE;

export interface QuoteListParams {
  q?: string;
  statut?: string;
  type?: string;
  responsable?: string;
  tri?: string;
  page?: number;
  client?: string;
  customerIds?: string[];
}

export function parseQuoteListParams(sp: Record<string, string | string[] | undefined>): QuoteListParams {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return {
    q: get("q")?.slice(0, 80),
    statut: get("statut"),
    type: get("type"),
    responsable: get("responsable"),
    tri: get("tri"),
    page: Math.max(1, Number(get("page") ?? 1) || 1),
    client: get("client"),
  };
}

export const QUOTE_LIST_SELECT =
  "id, reference, title, status, service_type, amount_ht_cents, amount_ttc_cents, issued_on, sent_at, expires_on, next_followup_at, followup_count, followups_paused, owner_id, customer:customers(id, name, company_name, email, phone, do_not_contact)";

/** Construit la requête de liste filtrée (réutilisée pour l'export CSV). */
export function buildQuoteQuery(db: Db, organizationId: string, p: QuoteListParams, opts: { count?: boolean } = {}) {
  let query = db
    .from("quotes")
    .select(QUOTE_LIST_SELECT, opts.count ? { count: "exact" } : undefined)
    .eq("organization_id", organizationId);

  const now = new Date().toISOString();
  switch (p.statut) {
    case undefined:
    case "":
    case "tous":
      break;
    case "ouverts":
      query = query.in("status", ["sent", "pending", "to_follow_up", "followed_up"]);
      break;
    case "a_relancer":
      query = query.or(`status.eq.to_follow_up,and(status.in.(sent,followed_up),next_followup_at.lte.${now})`);
      break;
    case "clos":
      query = query.in("status", ["accepted", "declined", "expired", "cancelled"]);
      break;
    default:
      if ((QUOTE_STATUSES as readonly string[]).includes(p.statut)) query = query.eq("status", p.statut as QuoteStatus);
  }
  if (p.type && (SERVICE_TYPES as readonly string[]).includes(p.type)) query = query.eq("service_type", p.type as (typeof SERVICE_TYPES)[number]);
  if (p.responsable && /^[0-9a-f-]{36}$/.test(p.responsable)) query = query.eq("owner_id", p.responsable);
  if (p.client && /^[0-9a-f-]{36}$/.test(p.client)) query = query.eq("customer_id", p.client);
  if (p.q) {
    const term = p.q.replace(/[%_,()\\*]/g, " ").trim();
    if (term) {
      const byCustomer = p.customerIds && p.customerIds.length > 0 ? `,customer_id.in.(${p.customerIds.join(",")})` : "";
      query = query.or(`reference.ilike.%${term}%,title.ilike.%${term}%${byCustomer}`);
    }
  }
  const [rawKey, dir] = (p.tri ?? "date:desc").split(":");
  const key = (rawKey in SORTABLE ? rawKey : "date") as SortKey;
  query = query.order(SORTABLE[key], { ascending: dir === "asc", nullsFirst: false }).order("created_at", { ascending: false });
  return query;
}

/** Recherche par nom de client : identifiants des clients correspondants. */
export async function customerIdsMatching(db: Db, organizationId: string, q: string) {
  const term = q.replace(/[%_,()\\*]/g, " ").trim();
  if (!term) return [];
  const { data } = await db
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`)
    .limit(200);
  return (data ?? []).map((c) => c.id);
}
