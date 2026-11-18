const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const EUR_ROUND = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Formate un montant en centimes : 123456 → « 1 234,56 € ». */
export function formatCents(cents: number | null | undefined, opts: { round?: boolean } = {}): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "—";
  return (opts.round ? EUR_ROUND : EUR).format(cents / 100);
}

/** Formate en notation compacte pour les axes (12 k€). */
export function formatCentsCompact(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1_000_000) return `${(euros / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
  if (Math.abs(euros) >= 1_000) return `${(euros / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(euros).toLocaleString("fr-FR")} €`;
}

/**
 * Convertit une saisie libre en centimes. Gère les formats français et anglais :
 * « 1 234,56 € », « 1.234,56 », « 1234.5 », « 12 500 », « 1,234.56 ».
 * Retourne null si la valeur n'est pas un montant valide.
 */
export function parseAmountToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  let s = input
    .replace(/[\s  ']/g, "")
    .replace(/€|eur(os?)?|ht|ttc/gi, "")
    .trim();
  if (s === "") return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let fracPart = "";
  if (lastComma >= 0 && lastDot >= 0) {
    const decIdx = Math.max(lastComma, lastDot);
    intPart = s.slice(0, decIdx).replace(/[.,]/g, "");
    fracPart = s.slice(decIdx + 1);
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length > 2) {
      // « 1,234,567 » : séparateurs de milliers
      if (!parts.slice(1).every((p) => p.length === 3)) return null;
      intPart = parts.join("");
    } else {
      intPart = parts[0];
      fracPart = parts[1];
    }
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== "0")) {
      // « 1.234 » ou « 1.234.567 » : séparateurs de milliers
      if (!parts.slice(1).every((p) => p.length === 3)) return null;
      intPart = parts.join("");
    } else {
      intPart = parts[0];
      fracPart = parts[1] ?? "";
    }
  } else {
    intPart = s;
  }
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (fracPart.length > 2) {
    // arrondi au centime
    const value = Number(`${intPart}.${fracPart}`);
    const cents = Math.round(value * 100);
    return negative ? -cents : cents;
  }
  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, "0") || "0");
  return negative ? -cents : cents;
}

/** Taux de TVA en points de base : « 20 % » → 2000, « 5,5 » → 550, « 0.2 » → 2000. */
export function parseVatRateToBp(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let value: number;
  if (typeof input === "number") value = input;
  else {
    const s = input.replace(/[\s %]/g, "").replace(",", ".");
    if (s === "") return null;
    value = Number(s);
  }
  if (!Number.isFinite(value) || value < 0) return null;
  if (value > 0 && value < 1) value = value * 100; // 0.2 → 20
  if (value > 100) return null;
  return Math.round(value * 100);
}

/** TTC = HT + TVA, arrondi au centime. */
export function computeTtcCents(htCents: number, vatRateBp: number): number {
  return htCents + Math.round((htCents * vatRateBp) / 10000);
}

/** HT à partir du TTC. */
export function computeHtCents(ttcCents: number, vatRateBp: number): number {
  return Math.round((ttcCents * 10000) / (10000 + vatRateBp));
}

/** Valeur décimale pour un champ de formulaire : 123456 → « 1234,56 ». */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const euros = Math.trunc(cents / 100);
  const rest = Math.abs(cents % 100);
  return rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, "0")}`;
}

export function formatVatRate(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return "Mixte";
  return `${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}
