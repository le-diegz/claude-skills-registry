/**
 * Jours ouvrés en France métropolitaine : lundi → vendredi, hors jours fériés légaux.
 * Les calculs se font sur des dates calendaires (année, mois, jour) sans fuseau.
 */

export interface CalendarDay {
  year: number;
  month: number; // 1-12
  day: number;
}

function key(d: CalendarDay): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): CalendarDay {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

export function addCalendarDays(d: CalendarDay, n: number): CalendarDay {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

const holidayCache = new Map<number, Set<string>>();

/** Jours fériés légaux en France métropolitaine. */
export function frenchPublicHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const days: CalendarDay[] = [
    { year, month: 1, day: 1 }, // Jour de l'an
    addCalendarDays(easter, 1), // Lundi de Pâques
    { year, month: 5, day: 1 }, // Fête du travail
    { year, month: 5, day: 8 }, // Victoire 1945
    addCalendarDays(easter, 39), // Ascension
    addCalendarDays(easter, 50), // Lundi de Pentecôte
    { year, month: 7, day: 14 }, // Fête nationale
    { year, month: 8, day: 15 }, // Assomption
    { year, month: 11, day: 1 }, // Toussaint
    { year, month: 11, day: 11 }, // Armistice
    { year, month: 12, day: 25 }, // Noël
  ];
  const set = new Set(days.map(key));
  holidayCache.set(year, set);
  return set;
}

export function dayOfWeek(d: CalendarDay): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay(); // 0 = dimanche
}

export function isPublicHoliday(d: CalendarDay): boolean {
  return frenchPublicHolidays(d.year).has(key(d));
}

export function isBusinessDay(d: CalendarDay): boolean {
  const dow = dayOfWeek(d);
  return dow !== 0 && dow !== 6 && !isPublicHoliday(d);
}

/** Ajoute n jours ouvrés (n ≥ 0). Avec n = 0, avance au prochain jour ouvré si besoin. */
export function addBusinessDays(d: CalendarDay, n: number): CalendarDay {
  let current = d;
  let remaining = n;
  while (remaining > 0) {
    current = addCalendarDays(current, 1);
    if (isBusinessDay(current)) remaining--;
  }
  while (!isBusinessDay(current)) current = addCalendarDays(current, 1);
  return current;
}

export function nextBusinessDay(d: CalendarDay): CalendarDay {
  return addBusinessDays(d, 0);
}

export function calendarDayKey(d: CalendarDay): string {
  return key(d);
}
