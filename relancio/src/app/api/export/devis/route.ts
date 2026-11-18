import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { buildQuoteQuery, customerIdsMatching, parseQuoteListParams } from "@/lib/queries/quotes";
import { csvEscape } from "@/lib/domain/csv-import";
import { QUOTE_STATUS_LABELS, SERVICE_TYPE_LABELS, type QuoteStatus, type ServiceType } from "@/lib/domain/constants";
import { centsToInput } from "@/lib/domain/money";
import { formatDate, todayParis } from "@/lib/domain/dates";
import { logAudit } from "@/lib/services/audit";

export async function GET(request: NextRequest) {
  const s = await getSession();
  if (!s.user || !s.organization) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(s.role, "data.export")) return NextResponse.json({ error: "Export réservé aux administrateurs" }, { status: 403 });

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const params = parseQuoteListParams(sp);
  if (params.q) params.customerIds = await customerIdsMatching(s.supabase, s.organization.id, params.q);
  let query = buildQuoteQuery(s.supabase, s.organization.id, params).limit(10000);
  const ids = (sp.ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (ids.length > 0) query = query.in("id", ids);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const esc = csvEscape(";");
  const header = ["Référence", "Client", "Entreprise", "Email", "Téléphone", "Titre du chantier", "Type de prestation", "Montant HT", "Montant TTC", "Date du devis", "Date d'envoi", "Date d'expiration", "Statut", "Relances effectuées", "Prochaine relance"];
  const lines = (data ?? []).map((q) =>
    [
      q.reference,
      q.customer?.name,
      q.customer?.company_name,
      q.customer?.email,
      q.customer?.phone,
      q.title,
      SERVICE_TYPE_LABELS[q.service_type as ServiceType],
      centsToInput(q.amount_ht_cents),
      centsToInput(q.amount_ttc_cents),
      formatDate(q.issued_on, "dd/MM/yyyy"),
      q.sent_at ? formatDate(q.sent_at, "dd/MM/yyyy") : "",
      q.expires_on ? formatDate(q.expires_on, "dd/MM/yyyy") : "",
      QUOTE_STATUS_LABELS[q.status as QuoteStatus],
      q.followup_count,
      q.next_followup_at ? formatDate(q.next_followup_at, "dd/MM/yyyy") : "",
    ]
      .map(esc)
      .join(";"),
  );
  await logAudit(s.supabase, { organizationId: s.organization.id, actorId: s.user.id, action: "quotes.exported", metadata: { count: lines.length } });
  const csv = "﻿" + [header.map(esc).join(";"), ...lines].join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relancio-devis-${todayParis()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
