import { formatCents } from "./money";
import { formatDate } from "./dates";

export const TEMPLATE_VARIABLES = [
  { key: "client_name", label: "Nom du client" },
  { key: "company_name", label: "Nom de votre entreprise" },
  { key: "quote_reference", label: "Référence du devis" },
  { key: "quote_title", label: "Titre du chantier" },
  { key: "quote_amount", label: "Montant TTC" },
  { key: "quote_date", label: "Date d'envoi du devis" },
  { key: "expiration_date", label: "Date d'expiration" },
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]["key"];
export type TemplateValues = Record<TemplateVariable, string>;

const VAR_RE = /\{([a-z_]+)\}/g;
const KNOWN = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.key));

/** Remplace les variables {xxx}. Les variables inconnues sont laissées telles quelles. */
export function renderTemplate(text: string, values: TemplateValues): string {
  return text.replace(VAR_RE, (match, name: string) =>
    KNOWN.has(name) ? values[name as TemplateVariable] : match,
  );
}

export function unknownVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(VAR_RE)) if (!KNOWN.has(m[1])) found.add(m[1]);
  return [...found];
}

/** Variables utilisées dont la valeur est vide (ex. pas de date d'expiration). */
export function emptyVariablesUsed(text: string, values: TemplateValues): string[] {
  const res = new Set<string>();
  for (const m of text.matchAll(VAR_RE)) {
    const k = m[1];
    if (KNOWN.has(k) && !values[k as TemplateVariable]) res.add(k);
  }
  return [...res];
}

export interface TemplateContext {
  customer: { name: string; company_name?: string | null };
  organization: { name: string };
  quote: {
    reference: string;
    title: string;
    amount_ttc_cents: number;
    sent_at: string | null;
    issued_on: string;
    expires_on: string | null;
  };
}

export function buildTemplateValues(ctx: TemplateContext): TemplateValues {
  return {
    client_name: ctx.customer.name,
    company_name: ctx.organization.name,
    quote_reference: ctx.quote.reference,
    quote_title: ctx.quote.title,
    quote_amount: formatCents(ctx.quote.amount_ttc_cents) + " TTC",
    quote_date: formatDate(ctx.quote.sent_at ?? ctx.quote.issued_on, "d MMMM yyyy"),
    expiration_date: ctx.quote.expires_on ? formatDate(ctx.quote.expires_on, "d MMMM yyyy") : "",
  };
}

/** Exemple de valeurs pour la prévisualisation dans les paramètres. */
export const SAMPLE_VALUES: TemplateValues = {
  client_name: "Mme Martin",
  company_name: "Votre entreprise",
  quote_reference: "DEV-2026-0142",
  quote_title: "Installation climatisation réversible 3 pièces",
  quote_amount: "6 480,00 € TTC",
  quote_date: "4 novembre 2026",
  expiration_date: "4 décembre 2026",
};
