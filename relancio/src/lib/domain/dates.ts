import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { APP_TIMEZONE } from "./constants";

/** Date courante dans le fuseau Europe/Paris. */
export function nowInParis(now: Date = new Date()): TZDate {
  return new TZDate(now.getTime(), APP_TIMEZONE);
}

export function toParis(date: Date | string | number): TZDate {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new TZDate(d.getTime(), APP_TIMEZONE);
}

/** Jour calendaire (YYYY-MM-DD) à Paris pour un instant donné. */
export function parisDayKey(date: Date | string | number): string {
  return format(toParis(date), "yyyy-MM-dd");
}

/** Début de journée à Paris (instant UTC). */
export function startOfParisDay(date: Date | string | number): Date {
  const p = toParis(date);
  return new Date(new TZDate(p.getFullYear(), p.getMonth(), p.getDate(), 0, 0, 0, APP_TIMEZONE).getTime());
}

export function endOfParisDay(date: Date | string | number): Date {
  const p = toParis(date);
  return new Date(new TZDate(p.getFullYear(), p.getMonth(), p.getDate(), 23, 59, 59, APP_TIMEZONE).getTime() + 999);
}

/** Instant UTC correspondant à une date calendaire + minutes depuis minuit, heure de Paris. */
export function parisDateTime(year: number, monthIndex: number, day: number, minutes = 0): Date {
  return new Date(
    new TZDate(year, monthIndex, day, Math.floor(minutes / 60), minutes % 60, 0, APP_TIMEZONE).getTime(),
  );
}

/** Convertit un `date` SQL (YYYY-MM-DD) en instant (midi à Paris, pour éviter les décalages). */
export function dateOnlyToInstant(dateOnly: string, minutes = 12 * 60): Date {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return parisDateTime(y, m - 1, d, minutes);
}

export function formatDate(value: Date | string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!value) return "—";
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? dateOnlyToInstant(value) : new Date(value);
  if (!isValid(d)) return "—";
  return format(toParis(d), pattern, { locale: fr });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return formatDate(value, "d MMM yyyy 'à' HH:mm");
}

export function formatRelative(value: Date | string | null | undefined, now: Date = new Date()): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!isValid(d)) return "—";
  const diff = d.getTime() - now.getTime();
  if (Math.abs(diff) < 60_000) return "à l'instant";
  const dist = formatDistanceToNowStrict(d, { locale: fr, addSuffix: false });
  return diff < 0 ? `il y a ${dist}` : `dans ${dist}`;
}

/** Nombre de jours calendaires (Paris) entre deux instants. */
export function parisDaysBetween(from: Date | string, to: Date | string): number {
  const a = startOfParisDay(from).getTime();
  const b = startOfParisDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Analyse une date saisie ou importée (formats français prioritaires).
 * Accepte : 31/12/2026, 31/12/26, 31-12-2026, 31.12.2026, 2026-12-31, 2026-12-31T10:00:00Z, 31 déc. 2026.
 * Retourne la date calendaire YYYY-MM-DD ou null.
 */
export function parseFrenchDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (s === "") return null;
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t\s].*)?$/);
  if (match) {
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else if ((match = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})(?:\s+\d{1,2}[:h]\d{2}(?::\d{2})?)?$/))) {
    d = Number(match[1]);
    m = Number(match[2]);
    y = Number(match[3]);
    if (match[3].length === 2) y += y >= 70 ? 1900 : 2000;
  } else if ((match = s.match(/^(\d{1,2})\s+([a-zéû.]+)\s+(\d{4})$/))) {
    const months = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
    const alt = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];
    const word = match[2].replace(".", "");
    const plain = word.normalize("NFD").replace(/[̀-ͯ]/g, "");
    let idx = months.findIndex((mm) => word.startsWith(mm.replace(".", "")));
    if (idx < 0) idx = alt.findIndex((mm) => plain.startsWith(mm));
    if (idx < 0) return null;
    d = Number(match[1]);
    m = idx + 1;
    y = Number(match[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Date calendaire du jour à Paris (YYYY-MM-DD). */
export function todayParis(now: Date = new Date()): string {
  return parisDayKey(now);
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
