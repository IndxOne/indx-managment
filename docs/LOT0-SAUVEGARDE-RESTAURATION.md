# Lot 0 — Procédure de sauvegarde et restauration (non exécutée)

Document préalable au Lot 1 (Auth Supabase OTP). Décrit la procédure à
suivre **avant** tout lot touchant aux données, RLS ou migrations. Rien
ici n'a été exécuté : aucune sauvegarde réelle n'a été prise, aucun accès
au projet Supabase distant n'a eu lieu pendant la préparation de ce
document (contrainte explicite du Lot 0).

## Périmètre

Tables concernées (cf. `docs/AUDIT.md` pour l'inventaire complet) :
`projets_workspaces`, `projets_actions`, `projets_members`,
`projets_hub_settings`, `projets_recurrence_rules`, `projets_carnet_notes`,
`projets_push_subscriptions`, `sync_snapshots`.

## 1. Sauvegarde logique

- Export SQL complet du schéma `public` via Supabase CLI (`supabase db dump`)
  ou Dashboard (Database → Backups → export manuel).
- À exécuter par le propriétaire du projet (accès Dashboard requis, hors
  de ce que cette session peut faire — aucun accès Supabase distant ici).
- Nommage suggéré : `backup-lot0-YYYYMMDD-HHmm.sql`, conservé hors du
  dépôt git (jamais commité — contient des données réelles).

## 2. Inventaire des volumes (avant sauvegarde)

Comptage par table, à exécuter côté Dashboard/SQL editor avant l'export,
pour disposer d'une référence de vérification :

```sql
select 'projets_workspaces' as table_name, count(*) from public.projets_workspaces
union all select 'projets_actions', count(*) from public.projets_actions
union all select 'projets_members', count(*) from public.projets_members
union all select 'projets_hub_settings', count(*) from public.projets_hub_settings
union all select 'projets_recurrence_rules', count(*) from public.projets_recurrence_rules
union all select 'projets_carnet_notes', count(*) from public.projets_carnet_notes
union all select 'projets_push_subscriptions', count(*) from public.projets_push_subscriptions
union all select 'sync_snapshots', count(*) from public.sync_snapshots;
```

Conserver le résultat horodaté avec le dump (preuve de référence, §6).

## 3. Export des données (vérification humaine)

En complément du dump SQL, export CSV ciblé des tables les plus sensibles
à relire manuellement : `projets_hub_settings` (données financières
personnelles), `projets_members` (emails). Permet une vérification rapide
sans dérouler tout le SQL.

## 4. Vérification d'intégrité

Après export :
- Comparer les comptages du dump à ceux du §2 (doivent être strictement
  identiques — export à froid, pas de fenêtre d'écriture concurrente
  attendue sur un outil mono-utilisateur).
- Contrôler quelques `id` aléatoires (un par table) : présents dans le
  dump avec les mêmes valeurs qu'en base source.

## 5. Environnement de test

**Ne jamais tester une restauration directement sur le projet de
production.** Deux options, à trancher par le propriétaire :
- un second projet Supabase dédié aux tests (gratuit en dessous des
  quotas actuels du projet) ;
- une branche Supabase (fonctionnalité native, si disponible sur le plan
  du projet `indxone-Hub`).

## 6. Restauration contrôlée (sur l'environnement de test uniquement)

- Restaurer le dump SQL sur l'environnement de test.
- Rejouer le comptage du §2 sur l'environnement restauré.
- Comparer à la référence horodatée avant export.

## 7. Preuve de restauration

Conserver ensemble, horodatés : le dump, le comptage avant export, le
comptage après restauration, et un échantillon de lignes identiques
(mêmes `id`, mêmes valeurs). Ce triptyque constitue la preuve exploitable
en cas de besoin réel de rollback base de données.

## 8. Critères autorisant un retour arrière

Un retour arrière (restauration réelle sur production, ou abandon d'un
lot en cours) est déclenché si l'un de ces critères est atteint :
- comptage post-restauration différent du comptage de référence ;
- une policy RLS a été modifiée sans validation explicite préalable ;
- un test de non-régression (Lot 0, cf. `supabase-store.test.tsx`,
  `client.test.ts`, `user-hash.test.ts`, `provider-selection.test.tsx`)
  échoue après un commit d'un lot ultérieur ;
- `npm run typecheck`, `npm run lint`, `npm test` ou `npm run build`
  échoue après un commit et ne peut être corrigé immédiatement.

Dans tous les cas : retour au dernier commit vert via `git revert` (jamais
de réécriture d'historique partagé, jamais de `--force`). Aucune
migration n'étant créée aux Lots 0-1, un rollback applicatif suffit tant
que ces lots ne sont pas dépassés — un rollback base de données ne devient
pertinent qu'à partir du lot de migration RLS/données (hors périmètre
actuel).

## Rappel

Cette procédure n'a été **ni exécutée, ni testée** dans le cadre du Lot 0.
Elle sert de référence pour le jour où une sauvegarde réelle sera
autorisée explicitement par le propriétaire du projet.
