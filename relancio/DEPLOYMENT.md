# Déploiement — Vercel + Supabase

## 1. Supabase (production)

1. Créer un projet (région **UE**, ex. Paris `eu-west-3` ou Francfort). Plan Pro recommandé (sauvegardes quotidiennes).
2. Appliquer les migrations : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.
3. **Auth › URL configuration** : Site URL = `https://<domaine>` ; Redirect URLs : `https://<domaine>/**`.
4. **Auth › Email templates** : reprendre `supabase/templates/*.html` (liens `{{ .SiteURL }}/auth/confirm?token_hash=...`) pour Confirmation, Reset password, Change email.
5. **Auth › Providers › Email** : « Confirm email » activé, mot de passe minimum 10 caractères (lettres + chiffres).
6. **Auth › SMTP** : configurer un SMTP (ex. Resend SMTP) — le SMTP intégré Supabase est limité à quelques emails/heure.
7. Vérifier que le bucket `quote-attachments` est **privé** (créé par la migration).
8. Advisors Supabase (Security / Performance) : aucun avertissement bloquant.

## 2. Resend (optionnel, envoi direct)

1. Vérifier un domaine d'envoi (SPF, DKIM, DMARC), ex. `mail.<domaine>`.
2. Créer une clé API « Sending access » → `RESEND_API_KEY`. `RESEND_FROM_EMAIL=relances@mail.<domaine>`.
3. Webhook → `https://<domaine>/api/webhooks/resend`, événements `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.failed` → secret `RESEND_WEBHOOK_SECRET`.
4. Dans l'application : Paramètres › Email → activer, vérifier l'adresse de réponse, envoyer un email de test.

## 3. Vercel

1. Importer le dépôt (racine du projet), framework Next.js.
2. Variables d'environnement (Production + Preview) : voir `.env.example`. `CRON_SECRET` = 32+ caractères aléatoires (`openssl rand -hex 32`).
3. `vercel.json` déclare le cron `/api/cron/followups` toutes les heures (minute 5). Sur le plan Hobby, Vercel limite les crons à une exécution par jour : utiliser le plan Pro ou un planificateur externe (GitHub Actions, cron-job.org) qui appelle l'URL avec `Authorization: Bearer <CRON_SECRET>`.
4. Domaine personnalisé + HTTPS.

## 4. Checklist avant mise en production

- [ ] Migrations appliquées, `npm run db:types` à jour.
- [ ] Variables d'environnement définies, `SUPABASE_SERVICE_ROLE_KEY` **jamais** préfixée `NEXT_PUBLIC_`.
- [ ] Templates email Auth + SMTP configurés ; inscription testée de bout en bout sur le domaine.
- [ ] Cron testé : `curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/followups` → `{"ok":true,...}` ; sans en-tête → 401.
- [ ] Resend : email de test reçu, webhook signé reçu (statut « delivered » visible sur une relance).
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build` verts.
- [ ] `npm run test:e2e` contre l'environnement de préproduction (`E2E_BASE_URL`, `MAILPIT_URL` à adapter ou test d'inscription manuel).
- [ ] Sauvegardes activées + test de restauration ; copie du bucket Storage planifiée.
- [ ] Mentions légales, politique de confidentialité et CGV complétées (`/mentions-legales`, `/confidentialite`), DPA avec les sous-traitants (Supabase, Vercel, Resend).
- [ ] Monitoring : logs Vercel, alertes Supabase, suivi des erreurs (ex. Sentry) à ajouter.
- [ ] Démo : `DEMO_RATE_LIMIT_PER_HOUR` adapté, cron de nettoyage des démos (> 7 jours) vérifié.
