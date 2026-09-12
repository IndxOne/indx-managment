# Product Renewal Baseline

Référence de base avant tout renouveau produit. Découle de `docs/AUDIT.md` +
vérifications live sur le projet Supabase `indxone-Hub` (wdxvhceddrtxworblfec).
Aucune réécriture totale : toute évolution future doit partir de ce socle par
migration incrémentale.

## 1. Invariants techniques à préserver

- **Reducer pur unique** (`app-reducer.ts`) partagé par `TemporaryStoreProvider`
  (mémoire) et `SupabaseStoreProvider` (persistant) via le même
  `StoreContextValue`. Ne jamais dupliquer la logique métier entre les deux.
- **Domaine sans dépendance React/Supabase** : `src/domain`, `src/presets`,
  `src/calendar`, `src/recurrence`, `src/reminders`, `src/migration` restent
  purs et testables sans DOM ni réseau.
- **Colonne `schedule` jsonb unifiée** sur `projets_actions` (déjà en place en
  prod, 30/30 lignes non nulles) : plus de colonnes `due_date`/`week`/`month`
  séparées. Toute évolution du modèle temporel doit rester compatible avec
  cette forme ou fournir une migration de données explicite.
- **RLS systématique** : chaque table `projets_*` + `sync_snapshots` a
  `user_hash = (select (current_setting('request.headers', true))::json ->>
  'x-user-hash')` en `USING`/`WITH CHECK`. Toute nouvelle table doit reprendre
  ce pattern (vérifié conforme sur les 7 tables publiques au 2026-09-11).
- **Navigation route-as-state-machine** (`Route` union dans `App.tsx`, pas de
  librairie router) : à conserver tant qu'aucun besoin de deep-linking complexe
  ne le justifie.
- **Migrations Supabase versionnées exhaustivement** (13 fichiers dans
  `supabase/migrations/`, reconstitués depuis `schema_migrations` le
  2026-09-11) : toute modification de schéma futur doit passer par une
  nouvelle migration fichier, jamais par une modification manuelle en base.

## 2. Composants à réutiliser

- `ActionCard` / `KanbanCard` (base commune à mutualiser en priorité si un
  refactor UI est engagé — actuellement dupliqués, cf. AUDIT.md).
- `SegmentedTabs` (pattern dupliqué à plusieurs endroits, bon candidat
  d'extraction en composant partagé).
- `BottomSheet`, `BottomNav`, `StateBlocks` : briques génériques déjà testées,
  réutilisables telles quelles pour toute nouvelle écran.
- `filter-actions.ts`, `quick-filters.ts` : logique de filtrage déjà pure et
  testée, à réutiliser plutôt que réécrire pour toute nouvelle vue.
- `calendar-engine.ts`, `recurrence-engine.ts`, `waiting-reminder.ts` : moteurs
  domaine stables, couverts par tests, aucune raison de les remplacer.

## 3. Fonctionnalités actuelles à préserver

- Gestion RUN / Projet (workspaces), Kanban avec drag & drop HTML5 natif.
- Filtres temporels, rappels d'attente (waiting reminders) + push web.
- Carnet de notes → conversion en action.
- Récurrence d'actions.
- Persistance optimiste Supabase (`trackPersist`/`queuePersist`).
- Réglages Hub (objectif mensuel, TJM, prévision trésorerie) —
  `projets_hub_settings`.

## 4. Fonctionnalités candidates à suppression

- **`src/migration/migrate-legacy-actions.ts`** : un seul commit dans son
  historique (créé le 2026-09-08, jamais modifié depuis), jamais appelé
  depuis `App.tsx` ni aucun adapter — seulement référencé par ses propres
  tests et par `src/app/qa/scenarios.test.ts` /
  `migration-dry-run.test.ts`. Preuve de non-nécessité confirmée en base
  live : `projets_actions` n'a **aucune** colonne legacy (`due_date`/`week`/
  `month`), 100 % des 30 lignes de production ont déjà `schedule` renseigné.
  **Décision de ce lot : conservé, non supprimé** (pas de preuve suffisante
  d'urgence, hors périmètre du lot actuel qui exclut tout changement majeur).
  À supprimer dans un lot dédié futur, avec confirmation explicite.
- CSS monolithique (1967 lignes) : à découper progressivement, pas de
  suppression fonctionnelle associée.

## 5. Correspondance ancien modèle → nouveau modèle

| Ancien modèle (actuel)                                   | Nouveau modèle (cible équipe V1)                          |
|-----------------------------------------------------------|-------------------------------------------------------------|
| `assigneeIds: string[]` sur action (modélisé, non exposé) | Conservé tel quel comme fondation multi-utilisateur V1      |
| `collaborationMode` (modélisé, non exposé en UI)          | Conservé tel quel comme capacité V1 du futur modèle équipe   |
| `user_hash` (identité anonyme par hash côté client)       | À terme : identité utilisateur réelle, RLS à faire évoluer   |
| Workspace = unité RUN/Projet mono-utilisateur             | Workspace partageable entre plusieurs `assigneeIds`          |

**Décision explicite (point 5 des instructions)** : `collaborationMode` et
`assigneeIds` sont **conservés dans le code** sans aucun développement
collaboratif avancé pour l'instant. Ils sont classés comme **capacités V1 du
futur modèle équipe** — leur présence actuelle (non exposée en UI, cf. audit :
seules occurrences hors domaine sont l'initialisation `assigneeIds: []` dans
`supabase-store.tsx`) ne constitue pas de la dette à nettoyer mais un socle
d'attente légitime.

## 6. Risques de migration

- **RLS mono-`user_hash`** : le futur modèle équipe nécessitera une évolution
  des policies RLS (passage d'un hash unique à une notion de membres/équipe) —
  risque de régression sécurité si mal séquencé. À traiter par migration
  Supabase dédiée + tests RLS explicites avant toute exposition UI collab.
- **`schedule` jsonb** : toute évolution de sa forme interne doit rester
  rétrocompatible avec les 30 lignes de production existantes (pas de
  colonne legacy de repli disponible).
- **Duplication `ActionCard`/`KanbanCard`** : une fusion tardive après ajout
  de fonctionnalités collaboratives (badges assignee, etc.) coûterait plus
  cher qu'une fusion faite maintenant, avant le renouveau.
- **`migrate-legacy-actions.ts` conservé mais non branché** : si supprimé
  plus tard sans revalidation, s'assurer qu'aucun nouvel import de données
  externes (ex. reprise d'un autre outil) ne dépende de ce chemin.
- **Absence de Prettier / CSS monolithique** : pas un risque de rupture
  fonctionnelle, mais un risque de vélocité si le renouveau touche beaucoup
  de fichiers en parallèle (conflits de formatage).
