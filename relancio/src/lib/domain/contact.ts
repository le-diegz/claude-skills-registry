/** Normalise un téléphone français (identique à la fonction SQL normalize_phone). */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits === "") return null;
  if (/^33[1-9]\d{8}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^330[1-9]\d{8}$/.test(digits)) return digits.slice(2);
  if (/^0033[1-9]\d{8}$/.test(digits)) return `0${digits.slice(4)}`;
  return digits;
}

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  return v === "" ? null : v;
}

export function formatPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return "";
  if (/^0\d{9}$/.test(n)) return n.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return input ?? "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(input: string): boolean {
  return EMAIL_RE.test(input.trim());
}

/** Normalise un nom pour la détection de doublons (minuscules, sans accents ni ponctuation). */
export function normalizeName(input: string | null | undefined): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(m|mme|mr|monsieur|madame|mlle|sarl|sas|eurl|sci|sa)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface DuplicateCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface DuplicateMatch<T extends DuplicateCandidate> {
  customer: T;
  reason: "email" | "phone" | "name";
}

/** Recherche des doublons probables d'un client parmi une liste existante. */
export function findDuplicateCustomers<T extends DuplicateCandidate>(
  input: { name?: string | null; email?: string | null; phone?: string | null },
  existing: readonly T[],
  excludeId?: string,
): DuplicateMatch<T>[] {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const name = normalizeName(input.name);
  const matches: DuplicateMatch<T>[] = [];
  for (const c of existing) {
    if (excludeId && c.id === excludeId) continue;
    if (email && normalizeEmail(c.email) === email) matches.push({ customer: c, reason: "email" });
    else if (phone && phone.length >= 9 && normalizePhone(c.phone) === phone) matches.push({ customer: c, reason: "phone" });
    else if (name && name.length >= 3 && normalizeName(c.name) === name) matches.push({ customer: c, reason: "name" });
  }
  return matches;
}
