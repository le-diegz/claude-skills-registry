export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "pending",
  "to_follow_up",
  "followed_up",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  pending: "En attente",
  to_follow_up: "À relancer",
  followed_up: "Relancé",
  accepted: "Accepté",
  declined: "Refusé",
  expired: "Expiré",
  cancelled: "Annulé",
};

export const QUOTE_STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  draft: "Pas encore transmis au client",
  sent: "Transmis, première relance programmée",
  pending: "Le client a répondu, décision attendue — relances suspendues",
  to_follow_up: "Une relance est due",
  followed_up: "Au moins une relance effectuée",
  accepted: "Signé par le client",
  declined: "Refusé par le client",
  expired: "Date de validité dépassée",
  cancelled: "Annulé par l'entreprise",
};

/** Statuts considérés comme « ouverts » (potentiel commercial en cours). */
export const OPEN_STATUSES: readonly QuoteStatus[] = ["sent", "pending", "to_follow_up", "followed_up"];
/** Statuts dans lesquels le moteur de relance est actif. */
export const FOLLOWUP_ACTIVE_STATUSES: readonly QuoteStatus[] = ["sent", "to_follow_up", "followed_up"];
export const CLOSED_STATUSES: readonly QuoteStatus[] = ["accepted", "declined", "expired", "cancelled"];
/** Statuts sélectionnables manuellement (les autres sont pilotés par le moteur). */
export const MANUAL_STATUSES: readonly QuoteStatus[] = ["draft", "sent", "pending", "accepted", "declined", "expired", "cancelled"];

export const SERVICE_TYPES = [
  "climatisation",
  "pompe_a_chaleur",
  "plomberie",
  "chauffage",
  "entretien",
  "depannage",
  "autre",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  climatisation: "Climatisation",
  pompe_a_chaleur: "Pompe à chaleur",
  plomberie: "Plomberie",
  chauffage: "Chauffage",
  entretien: "Entretien",
  depannage: "Dépannage",
  autre: "Autre",
};

export const CUSTOMER_TYPES = ["particulier", "professionnel", "collectivite", "syndic", "autre"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  collectivite: "Collectivité",
  syndic: "Syndic / bailleur",
  autre: "Autre",
};

export const LOST_REASONS = ["prix", "concurrent", "projet_reporte", "sans_reponse", "financement", "technique", "autre"] as const;
export type LostReason = (typeof LOST_REASONS)[number];
export const LOST_REASON_LABELS: Record<LostReason, string> = {
  prix: "Prix trop élevé",
  concurrent: "Concurrent retenu",
  projet_reporte: "Projet reporté",
  sans_reponse: "Sans réponse",
  financement: "Financement / aides",
  technique: "Contrainte technique",
  autre: "Autre",
};

export const ROLES = ["owner", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Accès complet, y compris suppression de l'entreprise et gestion des propriétaires.",
  admin: "Gère les membres, la politique de relance, les modèles, l'email et les exports.",
  member: "Crée et suit les devis, les clients et les relances. Pas de suppression ni de paramètres.",
};

export const FOLLOWUP_JOB_STATUSES = [
  "scheduled",
  "to_prepare",
  "pending_approval",
  "approved",
  "sending",
  "sent",
  "failed",
  "cancelled",
  "skipped",
] as const;
export type FollowupJobStatus = (typeof FOLLOWUP_JOB_STATUSES)[number];
export const FOLLOWUP_JOB_STATUS_LABELS: Record<FollowupJobStatus, string> = {
  scheduled: "Programmée",
  to_prepare: "À préparer",
  pending_approval: "En attente de validation",
  approved: "Validée",
  sending: "En cours d'envoi",
  sent: "Envoyée",
  failed: "En erreur",
  cancelled: "Annulée",
  skipped: "Ignorée",
};
export const OPEN_JOB_STATUSES: readonly FollowupJobStatus[] = ["scheduled", "to_prepare", "pending_approval", "approved", "failed"];

export const TEMPLATE_KINDS = ["first", "second", "last", "confirmation", "custom"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];
export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  first: "Première relance",
  second: "Deuxième relance",
  last: "Dernière relance",
  confirmation: "Demande de confirmation",
  custom: "Personnalisé",
};

export const VAT_RATES_BP = [2000, 1000, 550, 0] as const;
export const VAT_RATE_LABELS: Record<number, string> = {
  2000: "20 %",
  1000: "10 %",
  550: "5,5 %",
  0: "0 %",
};

export const APP_TIMEZONE = "Europe/Paris";
