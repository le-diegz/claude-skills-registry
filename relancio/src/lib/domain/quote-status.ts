import type { QuoteStatus } from "./constants";

/**
 * Transitions autorisées. Les statuts `to_follow_up` et `followed_up` sont pilotés par le
 * moteur de relance ; un utilisateur ne peut pas les choisir directement.
 */
const TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["draft", "pending", "to_follow_up", "followed_up", "accepted", "declined", "expired", "cancelled"],
  to_follow_up: ["sent", "followed_up", "pending", "accepted", "declined", "expired", "cancelled"],
  followed_up: ["to_follow_up", "pending", "accepted", "declined", "expired", "cancelled"],
  pending: ["sent", "followed_up", "accepted", "declined", "expired", "cancelled"],
  accepted: ["pending", "sent"],
  declined: ["pending", "sent", "accepted"],
  expired: ["sent", "pending", "accepted", "declined", "cancelled"],
  cancelled: ["draft", "sent"],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: QuoteStatus): readonly QuoteStatus[] {
  return TRANSITIONS[from];
}

export function isOpen(status: QuoteStatus): boolean {
  return status === "sent" || status === "pending" || status === "to_follow_up" || status === "followed_up";
}

export function isClosed(status: QuoteStatus): boolean {
  return status === "accepted" || status === "declined" || status === "expired" || status === "cancelled";
}

/**
 * Statut affiché : un devis envoyé/relancé dont la relance est échue est « À relancer »
 * même si la tâche de préparation n'est pas encore passée.
 */
export function displayStatus(
  status: QuoteStatus,
  nextFollowupAt: string | null,
  now: Date = new Date(),
): QuoteStatus {
  if ((status === "sent" || status === "followed_up") && nextFollowupAt && new Date(nextFollowupAt) <= now) {
    return "to_follow_up";
  }
  return status;
}
