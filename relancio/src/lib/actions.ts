import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  return { ok: false, error, fieldErrors };
}

export function fromZod(error: ZodError): { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Certains champs sont invalides.", fieldErrors };
}

/** Exécute une action et transforme les erreurs connues en résultat lisible. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return fail(e.message);
    // Les redirections Next.js doivent être propagées
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error("[action]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate key")) return fail("Cet élément existe déjà (doublon).");
    if (msg.includes("row-level security") || msg.includes("permission denied")) return fail("Action non autorisée.");
    if (msg.includes("cycle de relance")) return fail("Ce devis n'est plus dans un cycle de relance.");
    if (msg.includes("mode démonstration")) return fail("Envoi réel interdit en mode démonstration.");
    return fail("Une erreur inattendue est survenue. Réessayez dans un instant.");
  }
}

/** Lève une ActionError si une erreur Supabase est présente. */
export function assertNoError(error: { message: string; code?: string } | null, context: string): void {
  if (!error) return;
  if (error.code === "23505") throw new ActionError(`${context} : cet élément existe déjà.`);
  if (error.code === "42501") throw new ActionError("Action non autorisée.");
  if (error.message.includes("cycle de relance")) throw new ActionError("Ce devis n'est plus dans un cycle de relance.");
  if (error.message.includes("mode démonstration")) throw new ActionError("Envoi réel interdit en mode démonstration.");
  if (error.message.includes("au moins un propriétaire")) throw new ActionError("L'entreprise doit conserver au moins un propriétaire.");
  throw new Error(`${context}: ${error.message}`);
}
