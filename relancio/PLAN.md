# Relancio — Plan d'implémentation

Outil de suivi et de relance de devis pour TPE/PME (climatisation, PAC, plomberie, chauffage).

## 1. Architecture technique

| Couche | Choix | Raison |
| --- | --- | --- |
| Front + serveur | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict | Un seul déploiement Vercel, logique serveur au plus près de l'UI |
| UI | Tailwind CSS 4 + shadcn/ui (sources officielles, style new-york v4, Radix) + Lucide | Composants accessibles, cohérents, maintenables |
| Formulaires | React Hook Form + Zod (schémas partagés client/serveur) | Validation identique des deux côtés |
| Tableaux | TanStack Table v8 | Tri, sélection multiple, colonnes |
| Graphiques | Recharts via `components/ui/chart` (shadcn) | |
| Dates | date-fns + @date-fns/tz, fuseau Europe/Paris, stockage UTC | |
| Données | Supabase Postgres + RLS, Auth (email/mot de passe), Storage (bucket privé) | Multi-tenant sécurisé au niveau base |
| Emails | Resend (API HTTP, clé plateforme), webhooks Svix signés | Mode manuel si non configuré |
| Tâches | Route `/api/cron/followups` protégée par `CRON_SECRET` (Vercel Cron) | Idempotente, ne dépend pas d'un navigateur |
| Tests | Vitest (domaine + intégration base réelle) + Playwright (E2E complet) | |

### Organisation du code

```
src/
  app/
    (marketing)/          page d'accueil publique
    (auth)/               connexion, inscription, mot de passe, vérification
    auth/                 routes de confirmation (token_hash) et callback
    onboarding/           assistant de première connexion (4 étapes)
    (app)/                application authentifiée (sidebar + header)
    api/                  cron, webhooks, export, recherche
    demo/                 création d'un espace de démonstration isolé
    invitation/[token]/   acceptation d'invitation
  components/
    ui/                   shadcn/ui (non modifiés sauf imports)
    app/                  composants applicatifs (sidebar, header, badges…)
    quotes/ customers/ followups/ import/ dashboard/ settings/
  lib/
    domain/               logique métier PURE et testée (montants, statuts, moteur de relance,
                          jours ouvrés, templates, import CSV, statistiques)
    supabase/             clients (serveur, navigateur, admin, proxy)
    auth/                 contexte de session, rôles, permissions
    services/             opérations serveur (relances, emails, activité, audit, rate limit)
    validation/           schémas Zod
supabase/
  migrations/             SQL versionné (schéma, RLS, storage, fonctions)
  templates/              emails d'authentification (token_hash)
scripts/                  seed de démonstration
tests/                    vitest (unit + intégration) et e2e (Playwright)
```

### Multi-tenant et sécurité
- Chaque table métier porte `organization_id`. RLS activée partout ; fonctions `is_org_member()` et
  `has_org_role()` (SECURITY DEFINER, `search_path` vide).
- Les Server Actions utilisent le client Supabase **de l'utilisateur** (RLS appliquée) et vérifient
  en plus le rôle côté serveur (`requireRole`). La clé `service_role` n'est utilisée que pour : cron,
  webhooks, démo, suppression de compte, rate limiting.
- Rôles : `owner` (tout), `admin` (tout sauf suppression de l'entreprise et gestion des owners),
  `member` (devis, clients, relances ; pas de suppression, paramètres, export, membres).
- Triggers de cohérence : un devis clôturé (accepté/refusé/annulé/expiré) ou en attente de décision
  annule automatiquement ses relances ouvertes et vide `next_followup_at`.
- Démo : organisation `is_demo = true`, un espace par visiteur, envoi email bloqué en application
  **et** par trigger SQL.

## 2. Modèle de statuts

Devis : `draft` Brouillon · `sent` Envoyé · `pending` En attente (réponse reçue, décision attendue) ·
`to_follow_up` À relancer (système) · `followed_up` Relancé (système) · `accepted` Accepté ·
`declined` Refusé · `expired` Expiré · `cancelled` Annulé.

Ouverts = sent, pending, to_follow_up, followed_up. Transitions définies dans
`lib/domain/quote-status.ts` (testées) et appliquées côté serveur.

Relances (`followup_jobs`) : `scheduled` Programmée → `pending_approval` En attente de validation
(message généré) ou `to_prepare` À préparer (client sans email) → `approved` Validée → `sending` →
`sent` Envoyée | `failed` En erreur ; `cancelled` Annulée ; `skipped` Ignorée.
Contrainte SQL : `sending`/`sent` impossible sans `approved_by` (validation humaine obligatoire).
Idempotence : unicité `(quote_id, sequence)`, transition atomique `approved → sending`, clé
d'idempotence fournisseur = id de la relance.

## 3. Fonctionnalités et ordre de développement

| # | Lot | Priorité | État |
| --- | --- | --- | --- |
| 1 | Scaffolding, design system, palette, shadcn | P0 | ✅ |
| 2 | Schéma SQL, RLS, storage, triggers | P0 | ✅ |
| 3 | Auth (inscription, connexion, vérification email, reset, déconnexion) | P0 | ✅ |
| 4 | Onboarding 4 étapes + création entreprise | P0 | ✅ |
| 5 | Clients CRUD + doublons | P0 | ✅ |
| 6 | Devis CRUD, filtres, tri, pagination, sélection, actions groupées, export CSV, duplication, pièces jointes | P0 | ✅ |
| 7 | Moteur de relance (calcul, jours ouvrés FR, fenêtres horaires, arrêt) | P0 | ✅ |
| 8 | Centre de relances + templates + mode manuel | P0 | ✅ |
| 9 | Import CSV (encodage, séparateur, mapping, validation, doublons, rapport) | P0 | ✅ |
| 10 | Dashboard (KPI réels, priorités, graphiques) | P0 | ✅ |
| 11 | Mode démo isolé + réinitialisation | P0 | ✅ |
| 12 | Envoi Resend + webhooks + vérification expéditeur | P1 | ✅ (non testé contre l'API réelle : nécessite une clé) |
| 13 | Activité, audit, notifications | P1 | ✅ |
| 14 | Statistiques avec filtres | P1 | ✅ |
| 15 | Membres, invitations, rôles | P1 | ✅ |
| 16 | Paramètres (profil, entreprise, politique, templates, email, notifications, données, suppression) | P1 | ✅ |
| 17 | Vue Kanban | P1 | ✅ |
| 18 | Tests Vitest + Playwright, lint, typecheck, build | P0 | ✅ |
| — | Intégrations logiciels de devis, synchro boîte mail, détection réponses, SMS, Stripe | P2 | ❌ non commencé |

## 4. Critères d'acceptation (parcours critique)

1. Un nouvel utilisateur s'inscrit, confirme son email, crée son entreprise.
2. Il ajoute un client (doublon signalé si email/téléphone existant).
3. Il crée un devis en < 1 min ou importe un CSV (`;` ou `,`, décimales et dates françaises, UTF-8/Windows-1252).
4. Le devis apparaît au dashboard (montant ouvert, compteurs).
5. Une relance due apparaît dans « À traiter » ; le message est généré depuis le template.
6. Le message est modifiable puis **validé explicitement**.
7. Copie du message (ne marque pas comme envoyé) ou envoi via Resend si configuré.
8. « Marquer comme envoyé » enregistre l'action (communication + activité).
9. Le devis passé en « Accepté » annule les relances futures (trigger SQL).
10. Dashboard et statistiques reflètent immédiatement l'état réel.

Vérifié par `tests/e2e/critical-path.spec.ts` sur une base Supabase réelle.

## 5. Progression

Voir le tableau ci-dessus et la section « Résultats » du README pour l'état des tests.

## 6. Résultats de vérification (18/11/2026, Supabase local)

| Contrôle | Résultat |
| --- | --- |
| `npm run lint` | 0 erreur, 1 avertissement (TanStack Table non optimisable par React Compiler, sans impact) |
| `npm run typecheck` | OK (TypeScript strict) |
| Vitest unitaires (montants, dates FR, jours ouvrés/fériés, moteur, statuts, templates, import CSV, stats, doublons) | 83/83 |
| Vitest intégration sur base réelle (RLS, rôles, stockage, intégrité, moteur de relance, double envoi, échec email, démo, stats) | 38/38 |
| Playwright E2E (parcours critique complet, création < 1 min, doublons, recherche/export/Kanban, mobile) | 5/5 |
| `npm run build` | OK |
| Cron `/api/cron/followups` | 401 sans secret, idempotent avec secret |

## 7. Limites connues

- Envoi Resend et webhooks : code complet, testé avec un fournisseur simulé ; **pas testé contre l'API Resend réelle** (aucune clé fournie).
- Pas de détection automatique des réponses (aucune boîte entrante connectée) : bouton « Le client a répondu ».
- Pas d'intégration directe avec les logiciels de devis : import CSV uniquement (pas d'import Excel .xlsx natif).
- Notifications uniquement dans l'application (pas d'email de notification ni de push).
- Pas de facturation/abonnement (Stripe en P2), pas de SMS.
- Les textes légaux (mentions, confidentialité) sont des gabarits à compléter.
- Le Kanban change de statut via un menu (pas de glisser-déposer).
- Statistiques calculées en mémoire côté serveur : adapté à quelques milliers de devis par entreprise ; à migrer en vues SQL au-delà.
