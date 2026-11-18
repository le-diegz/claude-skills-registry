import "server-only";
import { getSession } from "./context";
import { ActionError } from "@/lib/actions";
import { can, type Permission } from "./permissions";
import type { Role } from "@/lib/domain/constants";

/** Contexte pour les Server Actions : lève une ActionError au lieu de rediriger. */
export async function actionContext(permission?: Permission) {
  const s = await getSession();
  if (!s.user) throw new ActionError("Votre session a expiré. Reconnectez-vous.");
  if (!s.organization || !s.role || !s.profile) throw new ActionError("Aucune entreprise active.");
  if (permission && !can(s.role, permission)) {
    throw new ActionError("Vous n'avez pas les droits nécessaires pour cette action.");
  }
  return {
    supabase: s.supabase,
    user: s.user,
    profile: s.profile,
    organization: s.organization,
    role: s.role as Role,
  };
}

export type ActionContext = Awaited<ReturnType<typeof actionContext>>;
