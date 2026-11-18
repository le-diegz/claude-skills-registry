# Relancio

Suivi et relance de devis pour les TPE/PME de la climatisation, des pompes à chaleur, de la plomberie et du chauffage.

Relancio importe ou enregistre vos devis, calcule les relances à faire (jours ouvrés, jours fériés français, horaires autorisés), prépare chaque message à partir de vos modèles et **vous le soumet pour validation**. Vous copiez le message ou l'envoyez par email (Resend), le client répond ou accepte, les relances s'arrêtent d'elles-mêmes, et le tableau de bord reflète l'état réel.

> Aucune relance n'est envoyée sans validation humaine explicite (contrainte applicative **et** contrainte SQL).

## Démarrage rapide (local)

Prérequis : Node.js 22+, Docker (pour Supabase local).

```bash
cd relancio
npm install
npx supabase start          # Postgres, Auth, Storage, Mailpit (emails locaux sur http://127.0.0.1:54324)
npx supabase db reset       # applique les migrations de supabase/migrations
cp .env.example .env.local  # puis renseignez les clés affichées par `npx supabase status`
npm run dev                 # http://localhost:3000
```

- Démo instantanée : http://localhost:3000/demo (espace isolé, données fictives, aucun envoi réel).
- Compte de démo fixe pour les rendez-vous commerciaux : `npm run seed:demo` (voir `SALES_DEMO.md`).
- En local, les emails d'authentification (confirmation, mot de passe) arrivent dans Mailpit.

> Si l'accès au registre `public.ecr.aws` est limité, lancez Supabase avec `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript strict |
| `npm test` | Tests unitaires (logique métier pure) |
| `npm run test:integration` | Tests sur la base Supabase locale (RLS, permissions, moteur de relance, démo, statistiques) |
| `npm run test:e2e` | Playwright : parcours critique, devis, mobile |
| `npm run db:reset` · `npm run db:types` | Migrations · génération des types |
| `npm run seed:demo` | Crée / réinitialise le compte de démonstration fixe |

## Variables d'environnement

Voir `.env.example`. Résumé :

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | oui | URL publique (liens des emails) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | Projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | oui | Serveur uniquement (cron, webhooks, démo, suppression de compte, rate limiting) |
| `CRON_SECRET` | oui en production | Protège `/api/cron/followups` (Vercel l'envoie en `Authorization: Bearer`) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | non | Active l'envoi direct. Sans elles : mode manuel |
| `RESEND_WEBHOOK_SECRET` | non | Statuts de délivrance (webhook `/api/webhooks/resend`) |
| `DEMO_RATE_LIMIT_PER_HOUR` | non | Démos créées par IP et par heure (défaut 8) |

Aucun identifiant externe n'est inventé ni versionné : `.env.local` est ignoré par git.

## Architecture

Voir `PLAN.md` pour le détail. En bref :

- **Next.js 16 (App Router)**, Server Components pour la lecture, **Server Actions** pour l'écriture, toutes validées par **Zod** côté serveur.
- **Supabase** : Postgres + **RLS sur toutes les tables**, Auth (email/mot de passe + vérification email), Storage privé (URLs signées 60 s).
- **Multi-tenant** : `organization_id` partout, helpers SQL `is_org_member()` / `has_org_role()`, triggers d'intégrité (aucune référence inter-entreprises, `organization_id` immuable).
- **Logique métier pure** dans `src/lib/domain` (montants en centimes, dates Europe/Paris, jours ouvrés, moteur de relance, import CSV, statistiques), testée unitairement.
- **Services** dans `src/lib/services` (relances, devis, activité, audit, notifications, email, rate limiting).
- **UI** : shadcn/ui (sources officielles new-york v4, Radix), Tailwind 4, Lucide, Recharts, TanStack Table, Sonner.

### Moteur de relance

1. Un devis passe « Envoyé » → la relance n°1 est **programmée** (date calculée : délai en jours ouvrés, au début de la fenêtre horaire).
2. Le cron horaire (et l'ouverture du tableau de bord / centre de relances) **prépare** les relances échues : message généré depuis le modèle → « En attente de validation » (ou « À préparer » si le client n'a pas d'email).
3. L'utilisateur relit, modifie, **valide**. Puis : *Envoyer par email* (si configuré, dans la fenêtre horaire, sinon mise en file), *Copier*, *Ouvrir ma messagerie*, ou *Marquer comme envoyé* / *Relance faite par téléphone*.
4. Après une relance : la suivante est programmée (max. 3).
5. **Arrêts** : accepté, refusé, annulé, expiré (trigger SQL), « Le client a répondu » (statut En attente), opposition du destinataire, suspension manuelle.
6. **Idempotence** : unicité `(quote_id, sequence)`, transitions conditionnelles, verrou `approved → sending`, clé d'idempotence Resend = id de la relance.

## Sécurité

- RLS + vérification des rôles côté serveur (`owner`, `admin`, `member`) ; matrice dans `src/lib/auth/permissions.ts`.
- Stockage privé, contrôle du type MIME **et** de la signature binaire, 10 Mo max, URLs signées courtes.
- Rate limiting partagé (table Postgres) : connexion, inscription, réinitialisation, envoi d'emails, imports, démo.
- En-têtes de sécurité (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- Journal d'audit append-only (exports, suppressions, rôles, configuration email, politique).
- Export CSV protégé contre l'injection de formules.
- Export complet JSON (portabilité), suppression de l'entreprise et du compte.

## Sauvegardes

- Supabase Pro : sauvegardes quotidiennes automatiques (7 jours), Point-in-Time Recovery en option. Sur le plan gratuit, aucune sauvegarde n'est garantie : activez au minimum un `pg_dump` planifié.
- Les fichiers du Storage ne sont **pas** inclus dans les sauvegardes Postgres : prévoir une copie du bucket `quote-attachments` (S3 compatible).
- Test de restauration recommandé avant la commercialisation.

## Déploiement

Voir `DEPLOYMENT.md`.

## Limites connues

Voir la section « Limites » de `PLAN.md` et le compte rendu de livraison.
