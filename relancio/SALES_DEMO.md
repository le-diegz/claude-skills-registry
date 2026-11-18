# Démonstration commerciale — Relancio

Durée conseillée : 12 minutes. Objectif : montrer au prospect qu'il **sait chaque matin qui relancer** et qu'il **garde la main** sur chaque message.

## Préparer la démo

- Option 1 (recommandée en rendez-vous) : `https://<votre-domaine>/demo` → crée un espace isolé « AéroClim Méditerranée » (entreprise fictive de climatisation), ~27 devis, historique de 6 mois, relances à valider. Bandeau « Démonstration — données fictives ». Aucun email réel ne peut partir (bloqué côté application et base).
- Option 2 : compte fixe `npm run seed:demo` → `demo@relancio.local` / `DemoRelancio2026` (relancer la commande avant chaque rendez-vous pour remettre les dates à jour).
- Bouton « Réinitialiser » dans le bandeau pour repartir de zéro.
- Préparer un CSV du prospect (ou le modèle `/modele-import-devis.csv`) pour montrer l'import.

## Déroulé

1. **Vue d'ensemble (1 min)** — « Ce matin, 3 relances sont prêtes. 13 devis ouverts, environ 100 000 € HT en jeu. »
   Préciser : c'est un **potentiel commercial**, pas du chiffre d'affaires perdu.
2. **Priorités du jour (3 min)** — ouvrir une relance : le message est rédigé avec le nom du client, la référence, le montant TTC et la date d'envoi.
   - Modifier une phrase, changer de modèle.
   - **Valider** → puis « Copier » / « Ouvrir ma messagerie » / « Marquer comme envoyé ».
   - Insister : *rien ne part sans validation*.
3. **Le client a répondu (1 min)** — sur un devis : « Le client a répondu » → statut En attente, relances suspendues.
4. **Accepté (1 min)** — « Accepté » : les relances futures sont annulées automatiquement, le dashboard se met à jour.
5. **Import CSV (3 min)** — `Devis › Importer` : dépôt du fichier, colonnes reconnues (point-virgule, « 1 234,56 », dates jj/mm/aaaa, export Excel), doublons signalés, rapport d'import. Les relances dues apparaissent immédiatement.
   Dire clairement : « Relancio ne se connecte pas à votre logiciel de devis, il lit son export CSV. »
6. **Politique de relance (1 min)** — délais J+3 / J+7 / J+14, jours ouvrés, fériés, horaires 9h–18h, aperçu du calendrier.
7. **Mobile (1 min)** — ouvrir sur téléphone : barre de navigation basse, bouton « + », appel du client depuis la fiche.
8. **Statistiques (1 min)** — taux d'acceptation, relances effectuées, acceptés après relance (expliquer : corrélation, pas preuve).

## Messages clés

- « Vous ne perdez plus un devis faute de relance. »
- « Vous validez chaque message : votre ton, votre relation client. »
- « Vos données restent les vôtres : export complet à tout moment. »

## Ce qu'il ne faut PAS promettre

- Pas d'intégration directe avec un logiciel de devis (import CSV uniquement).
- Pas de lecture automatique des réponses (bouton « Le client a répondu »).
- Pas d'envoi automatique sans validation.
- Pas de certification RGPD (bonnes pratiques mises en place, audit non réalisé).
- Pas de SMS (prévu en P2).

## Questions fréquentes

- *Combien de temps pour démarrer ?* Inscription, entreprise, import CSV : moins de 10 minutes.
- *Plusieurs commerciaux ?* Oui : invitations, rôles propriétaire / administrateur / membre, filtre par responsable.
- *Et si le client ne veut plus être relancé ?* Fiche client › « Ne souhaite plus être recontacté » : toutes ses relances s'arrêtent.
