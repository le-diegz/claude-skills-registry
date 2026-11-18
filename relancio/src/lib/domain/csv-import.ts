import Papa from "papaparse";
import { parseAmountToCents, parseVatRateToBp, computeHtCents, computeTtcCents } from "./money";
import { parseFrenchDate, todayParis } from "./dates";
import { isValidEmail, normalizeEmail, normalizePhone, normalizeName } from "./contact";
import type { QuoteStatus, ServiceType } from "./constants";

// ---------------------------------------------------------------------------
// Décodage et analyse
// ---------------------------------------------------------------------------

export type CsvEncoding = "utf-8" | "windows-1252";

/** Décode un fichier CSV : UTF-8 (avec ou sans BOM), sinon Windows-1252 (exports Excel FR). */
export function decodeCsv(buffer: ArrayBuffer | Uint8Array): { text: string; encoding: CsvEncoding } {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text: text.replace(/^﻿/, ""), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

const CANDIDATE_DELIMITERS = [";", ",", "\t", "|"] as const;
export type CsvDelimiter = (typeof CANDIDATE_DELIMITERS)[number];

/** Détecte le séparateur en comptant les occurrences hors guillemets sur les premières lignes. */
export function detectDelimiter(text: string): CsvDelimiter {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 10);
  let best: CsvDelimiter = ";";
  let bestScore = -1;
  for (const delim of CANDIDATE_DELIMITERS) {
    const counts = lines.map((line) => {
      let inQuotes = false;
      let n = 0;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === delim && !inQuotes) n++;
      }
      return n;
    });
    if (counts.length === 0 || counts[0] === 0) continue;
    const consistent = counts.filter((c) => c === counts[0]).length;
    const score = consistent * 100 + counts[0];
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }
  return best;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
}

export function parseCsv(text: string, delimiter?: CsvDelimiter): ParsedCsv {
  const delim = delimiter ?? detectDelimiter(text);
  const result = Papa.parse<string[]>(text, { delimiter: delim, skipEmptyLines: "greedy" });
  const all = result.data.map((r) => r.map((c) => (c ?? "").trim()));
  const [headerRow = [], ...rows] = all;
  const headers = headerRow.map((h, i) => h || `Colonne ${i + 1}`);
  return { headers, rows: rows.filter((r) => r.some((c) => c !== "")), delimiter: delim };
}

// ---------------------------------------------------------------------------
// Mapping des colonnes
// ---------------------------------------------------------------------------

export const IMPORT_FIELDS = [
  { key: "reference", label: "Référence du devis", required: true },
  { key: "customer_name", label: "Nom du client", required: true },
  { key: "customer_company", label: "Entreprise du client", required: false },
  { key: "customer_email", label: "Email du client", required: false },
  { key: "customer_phone", label: "Téléphone du client", required: false },
  { key: "customer_address", label: "Adresse", required: false },
  { key: "customer_postal_code", label: "Code postal", required: false },
  { key: "customer_city", label: "Ville", required: false },
  { key: "title", label: "Titre du chantier", required: false },
  { key: "service_type", label: "Type de prestation", required: false },
  { key: "amount_ht", label: "Montant HT", required: false },
  { key: "amount_ttc", label: "Montant TTC", required: false },
  { key: "vat_rate", label: "Taux de TVA", required: false },
  { key: "issued_on", label: "Date du devis", required: false },
  { key: "sent_at", label: "Date d'envoi", required: false },
  { key: "expires_on", label: "Date d'expiration", required: false },
  { key: "status", label: "Statut", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportField, number>>;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/n°|no\b|num\b/g, "numero")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SYNONYMS: Record<ImportField, string[]> = {
  reference: ["reference", "ref", "reference devis", "numero", "numero devis", "devis", "numero de devis", "id devis", "code devis", "piece", "numero piece"],
  customer_name: ["client", "nom client", "nom du client", "nom", "contact", "destinataire", "nom contact", "tiers", "client nom"],
  customer_company: ["entreprise", "societe", "raison sociale", "entreprise client", "societe client"],
  customer_email: ["email", "e mail", "mail", "courriel", "email client", "adresse email", "adresse mail"],
  customer_phone: ["telephone", "tel", "portable", "mobile", "telephone client", "numero de telephone", "gsm"],
  customer_address: ["adresse", "adresse client", "rue", "adresse chantier", "adresse 1"],
  customer_postal_code: ["code postal", "cp", "postal"],
  customer_city: ["ville", "commune", "localite", "ville client"],
  title: ["titre", "objet", "intitule", "libelle", "chantier", "designation", "description courte", "titre chantier", "objet du devis"],
  service_type: ["type", "type de prestation", "prestation", "categorie", "metier", "activite", "famille"],
  amount_ht: ["montant ht", "total ht", "ht", "prix ht", "montant hors taxe", "total hors taxe", "montant ht eur", "total ht eur"],
  amount_ttc: ["montant ttc", "total ttc", "ttc", "prix ttc", "montant", "total", "montant ttc eur", "total ttc eur", "net a payer"],
  vat_rate: ["tva", "taux tva", "taux de tva", "tva %"],
  issued_on: ["date", "date devis", "date du devis", "date creation", "date de creation", "cree le", "date emission", "date d emission"],
  sent_at: ["date envoi", "date d envoi", "envoye le", "date de transmission"],
  expires_on: ["date expiration", "date d expiration", "expiration", "validite", "date de validite", "valable jusqu au", "date fin validite", "echeance"],
  status: ["statut", "etat", "status", "situation"],
  notes: ["notes", "note", "commentaire", "commentaires", "remarque", "remarques", "observations"],
};

/** Propose un mapping automatique à partir des en-têtes. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const normalized = headers.map(norm);
  // 1. correspondances exactes, 2. inclusions
  for (const pass of ["exact", "contains"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field.key] !== undefined) continue;
      const syns = SYNONYMS[field.key];
      const idx = normalized.findIndex((h, i) => {
        if (used.has(i) || h === "") return false;
        if (pass === "exact") return syns.includes(h);
        return syns.some((s) => s.length > 3 && (h.includes(s) || (h.length > 3 && s.includes(h))));
      });
      if (idx >= 0) {
        mapping[field.key] = idx;
        used.add(idx);
      }
    }
  }
  return mapping;
}

export function missingRequiredFields(mapping: ColumnMapping): string[] {
  const missing: string[] = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.label);
  if (mapping.amount_ht === undefined && mapping.amount_ttc === undefined) missing.push("Montant HT ou TTC");
  return missing;
}

// ---------------------------------------------------------------------------
// Interprétation des valeurs
// ---------------------------------------------------------------------------

export function parseImportStatus(input: string | undefined): QuoteStatus | null {
  if (!input) return null;
  const s = norm(input);
  if (s === "") return null;
  if (/(accept|sign|gagn|valid|command|bon pour accord|bpa)/.test(s)) return "accepted";
  if (/(refus|perdu|decline|rejet|non retenu)/.test(s)) return "declined";
  if (/(annul)/.test(s)) return "cancelled";
  if (/(expir|caduc|perime)/.test(s)) return "expired";
  if (/(brouillon|draft|a envoyer|non envoye)/.test(s)) return "draft";
  if (/(relance)/.test(s)) return "sent";
  if (/(attente|en cours|envoye|transmis|ouvert|sent|pending)/.test(s)) return "sent";
  return null;
}

export function parseServiceType(input: string | undefined, fallbackText = ""): ServiceType {
  const s = norm(`${input ?? ""} ${fallbackText}`);
  if (/(pompe a chaleur|\bpac\b|aerotherm|geotherm|air eau|ballon thermo)/.test(s)) return "pompe_a_chaleur";
  if (/(clim|split|gainable|multisplit|air air|rafraich)/.test(s)) return "climatisation";
  if (/(chaudiere|chauffage|radiateur|plancher chauffant|poele)/.test(s)) return "chauffage";
  if (/(plomb|sanitaire|salle de bain|chauffe eau|cumulus|fuite|evacuation|wc|douche)/.test(s)) return "plomberie";
  if (/(entretien|maintenance|contrat)/.test(s)) return "entretien";
  if (/(depann|reparation|urgence|sav)/.test(s)) return "depannage";
  return "autre";
}

export interface ImportQuoteData {
  reference: string;
  title: string;
  service_type: ServiceType;
  amount_ht_cents: number;
  amount_ttc_cents: number;
  vat_rate_bp: number | null;
  issued_on: string;
  sent_on: string | null;
  expires_on: string | null;
  status: QuoteStatus;
  notes: string | null;
  customer: {
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    address_line: string | null;
    postal_code: string | null;
    city: string | null;
  };
}

export interface ValidatedImportRow {
  rowNumber: number; // numéro de ligne dans le fichier (en-tête = 1)
  raw: Record<string, string>;
  data: ImportQuoteData | null;
  errors: string[];
  warnings: string[];
  duplicate: "file" | "existing" | null;
}

export interface ValidateOptions {
  existingReferences: Iterable<string>;
  today?: string;
  defaultVatRateBp?: number;
}

function cell(row: string[], mapping: ColumnMapping, field: ImportField): string {
  const idx = mapping[field];
  if (idx === undefined) return "";
  return (row[idx] ?? "").trim();
}

/** Valide et convertit les lignes d'un CSV selon le mapping. Fonction pure (client et serveur). */
export function validateImportRows(
  parsed: Pick<ParsedCsv, "headers" | "rows">,
  mapping: ColumnMapping,
  options: ValidateOptions,
): ValidatedImportRow[] {
  const today = options.today ?? todayParis();
  const defaultVat = options.defaultVatRateBp ?? 2000;
  const existing = new Set([...options.existingReferences].map((r) => r.trim().toLowerCase()));
  const seen = new Set<string>();

  return parsed.rows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const raw: Record<string, string> = {};
    parsed.headers.forEach((h, idx) => (raw[h] = row[idx] ?? ""));

    const reference = cell(row, mapping, "reference");
    const customerName = cell(row, mapping, "customer_name") || cell(row, mapping, "customer_company");
    if (!reference) errors.push("Référence manquante");
    else if (reference.length > 60) errors.push("Référence trop longue (60 caractères max.)");
    if (!customerName) errors.push("Nom du client manquant");

    // Montants
    const htRaw = cell(row, mapping, "amount_ht");
    const ttcRaw = cell(row, mapping, "amount_ttc");
    const vatRaw = cell(row, mapping, "vat_rate");
    let ht = htRaw ? parseAmountToCents(htRaw) : null;
    let ttc = ttcRaw ? parseAmountToCents(ttcRaw) : null;
    let vat = vatRaw ? parseVatRateToBp(vatRaw) : null;
    if (htRaw && ht === null) errors.push(`Montant HT illisible : « ${htRaw} »`);
    if (ttcRaw && ttc === null) errors.push(`Montant TTC illisible : « ${ttcRaw} »`);
    if (vatRaw && vat === null) warnings.push(`Taux de TVA illisible : « ${vatRaw} », ignoré`);
    if ((ht !== null && ht < 0) || (ttc !== null && ttc < 0)) errors.push("Montant négatif");
    if (ht === null && ttc === null && !htRaw && !ttcRaw) errors.push("Montant manquant");
    if (ht !== null && ttc === null) {
      const rate = vat ?? defaultVat;
      if (vat === null) warnings.push(`TVA non précisée : ${rate / 100} % appliquée pour le TTC`);
      ttc = computeTtcCents(ht, rate);
      vat = rate;
    } else if (ttc !== null && ht === null) {
      const rate = vat ?? defaultVat;
      if (vat === null) warnings.push(`TVA non précisée : HT calculé avec ${rate / 100} %`);
      ht = computeHtCents(ttc, rate);
      vat = rate;
    } else if (ht !== null && ttc !== null) {
      if (ttc < ht) errors.push("Montant TTC inférieur au HT");
      if (vat === null && ht > 0) {
        // Déduit le taux s'il correspond à un taux standard, sinon « mixte »
        for (const rate of [2000, 1000, 550, 0]) {
          if (Math.abs(computeTtcCents(ht, rate) - ttc) <= 1) {
            vat = rate;
            break;
          }
        }
      }
    }

    // Dates
    const issuedRaw = cell(row, mapping, "issued_on");
    const sentRaw = cell(row, mapping, "sent_at");
    const expiresRaw = cell(row, mapping, "expires_on");
    let issued = issuedRaw ? parseFrenchDate(issuedRaw) : null;
    const sent = sentRaw ? parseFrenchDate(sentRaw) : null;
    const expires = expiresRaw ? parseFrenchDate(expiresRaw) : null;
    if (issuedRaw && !issued) errors.push(`Date du devis illisible : « ${issuedRaw} »`);
    if (sentRaw && !sent) errors.push(`Date d'envoi illisible : « ${sentRaw} »`);
    if (expiresRaw && !expires) warnings.push(`Date d'expiration illisible : « ${expiresRaw} », ignorée`);
    if (!issued && !issuedRaw) {
      issued = sent ?? today;
      if (!sent) warnings.push("Date du devis absente : date du jour utilisée");
    }
    if (issued && issued > today) warnings.push("Date du devis dans le futur");
    let expiresOn = expires;
    if (expiresOn && issued && expiresOn < issued) {
      warnings.push("Date d'expiration antérieure à la date du devis, ignorée");
      expiresOn = null;
    }

    // Statut
    const statusRaw = cell(row, mapping, "status");
    let status = parseImportStatus(statusRaw);
    if (statusRaw && !status) warnings.push(`Statut « ${statusRaw} » non reconnu : « Envoyé » utilisé`);
    if (!status) status = "sent";

    // Contact
    const emailRaw = cell(row, mapping, "customer_email");
    let email: string | null = null;
    if (emailRaw) {
      if (isValidEmail(emailRaw)) email = normalizeEmail(emailRaw);
      else warnings.push(`Email invalide ignoré : « ${emailRaw} »`);
    }
    const phone = cell(row, mapping, "customer_phone") || null;

    const title = cell(row, mapping, "title") || (reference ? `Devis ${reference}` : "");
    const serviceRaw = cell(row, mapping, "service_type");

    // Doublons
    let duplicate: ValidatedImportRow["duplicate"] = null;
    if (reference) {
      const key = reference.toLowerCase();
      if (existing.has(key)) duplicate = "existing";
      else if (seen.has(key)) duplicate = "file";
      seen.add(key);
    }

    const valid = errors.length === 0 && ht !== null && ttc !== null && issued !== null;
    return {
      rowNumber: i + 2,
      raw,
      errors,
      warnings,
      duplicate,
      data: valid
        ? {
            reference,
            title: title.slice(0, 200),
            service_type: parseServiceType(serviceRaw, title),
            amount_ht_cents: ht!,
            amount_ttc_cents: ttc!,
            vat_rate_bp: vat,
            issued_on: issued!,
            sent_on: status === "draft" ? null : (sent ?? issued!),
            expires_on: expiresOn,
            status,
            notes: cell(row, mapping, "notes") || null,
            customer: {
              name: customerName.slice(0, 160),
              company_name: cell(row, mapping, "customer_company") || null,
              email,
              phone,
              address_line: cell(row, mapping, "customer_address") || null,
              postal_code: cell(row, mapping, "customer_postal_code") || null,
              city: cell(row, mapping, "customer_city") || null,
            },
          }
        : null,
    };
  });
}

/** Clé de rapprochement client : email, sinon téléphone, sinon nom normalisé. */
export function customerMatchKeys(c: { name: string; email: string | null; phone: string | null }): string[] {
  const keys: string[] = [];
  const e = normalizeEmail(c.email);
  if (e) keys.push(`e:${e}`);
  const p = normalizePhone(c.phone);
  if (p && p.length >= 9) keys.push(`p:${p}`);
  const n = normalizeName(c.name);
  if (n) keys.push(`n:${n}`);
  return keys;
}

export function summarizeValidation(rows: ValidatedImportRow[]) {
  const valid = rows.filter((r) => r.data && !r.duplicate);
  return {
    total: rows.length,
    valid: valid.length,
    duplicates: rows.filter((r) => r.duplicate).length,
    errors: rows.filter((r) => r.errors.length > 0).length,
    warnings: rows.filter((r) => r.warnings.length > 0).length,
    amountHtCents: valid.reduce((s, r) => s + (r.data?.amount_ht_cents ?? 0), 0),
  };
}

export const CSV_TEMPLATE_HEADERS = [
  "Référence",
  "Client",
  "Entreprise",
  "Email",
  "Téléphone",
  "Adresse",
  "Code postal",
  "Ville",
  "Titre du chantier",
  "Type de prestation",
  "Montant HT",
  "TVA",
  "Montant TTC",
  "Date du devis",
  "Date d'envoi",
  "Date d'expiration",
  "Statut",
  "Notes",
];

export function buildCsvTemplate(): string {
  const rows = [
    CSV_TEMPLATE_HEADERS,
    ["DEV-2026-001", "Mme Claire Martin", "", "claire.martin@exemple.fr", "06 12 34 56 78", "12 rue des Lilas", "69003", "Lyon", "Climatisation réversible séjour", "Climatisation", "3 450,00", "10 %", "3 795,00", "02/11/2026", "03/11/2026", "03/12/2026", "Envoyé", ""],
    ["DEV-2026-002", "M. Karim Benali", "SCI Les Tilleuls", "k.benali@exemple.fr", "04 72 00 00 00", "8 avenue Foch", "69006", "Lyon", "Pompe à chaleur air/eau 11 kW", "Pompe à chaleur", "12 800,00", "5,5 %", "13 504,00", "28/10/2026", "29/10/2026", "28/11/2026", "En attente", "Aides MaPrimeRénov' à vérifier"],
  ];
  return "﻿" + rows.map((r) => r.map(csvEscape(";")).join(";")).join("\r\n") + "\r\n";
}

export function csvEscape(delimiter: string) {
  return (value: string | number | null | undefined): string => {
    const s = value === null || value === undefined ? "" : String(value);
    // Protection contre l'injection de formules dans les tableurs
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return safe.includes(delimiter) || safe.includes('"') || safe.includes("\n") ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
}
