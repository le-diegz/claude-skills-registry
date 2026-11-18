import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/context";

export async function GET(request: NextRequest) {
  const s = await getSession();
  if (!s.user || !s.organization) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const raw = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (raw.length < 2) return NextResponse.json({ quotes: [], customers: [] });
  // Échappe les caractères spéciaux de PostgREST / LIKE
  const q = raw.replace(/[%_,()\\*]/g, " ").trim();
  const like = `%${q}%`;
  const orgId = s.organization.id;

  const [customersRes, quotesRes] = await Promise.all([
    s.supabase
      .from("customers")
      .select("id, name, company_name, email, phone")
      .eq("organization_id", orgId)
      .or(`name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(6),
    s.supabase
      .from("quotes")
      .select("id, reference, title, status, amount_ht_cents, customer:customers(name)")
      .eq("organization_id", orgId)
      .or(`reference.ilike.${like},title.ilike.${like}`)
      .order("issued_on", { ascending: false })
      .limit(8),
  ]);

  // Devis des clients trouvés (recherche par nom de client)
  const customerIds = (customersRes.data ?? []).map((c) => c.id);
  let byCustomer: typeof quotesRes.data = [];
  if (customerIds.length > 0) {
    const { data } = await s.supabase
      .from("quotes")
      .select("id, reference, title, status, amount_ht_cents, customer:customers(name)")
      .eq("organization_id", orgId)
      .in("customer_id", customerIds)
      .order("issued_on", { ascending: false })
      .limit(6);
    byCustomer = data ?? [];
  }
  const seen = new Set<string>();
  const quotes = [...(quotesRes.data ?? []), ...(byCustomer ?? [])]
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
    .slice(0, 8)
    .map((x) => ({ id: x.id, reference: x.reference, title: x.title, status: x.status, amount_ht_cents: x.amount_ht_cents, customer: x.customer?.name ?? "" }));

  return NextResponse.json({ quotes, customers: customersRes.data ?? [] });
}
