# Audit — INDXONE Projets

Date : 11 septembre 2026. Périmètre : dépôt `indx-managment` à l'état actuel de `main` (post Lots 1-3). 257 tests, 45 fichiers de test, ~8 900 lignes de code source hors tests.

## Architecture actuelle

**Stack** : React 18 + TypeScript strict, Vite 5.4, Vitest + Testing Library, ESLint flat config, PWA (service worker `vite-plugin-pwa`). Dépendances de production : `react`, `react-dom`, `@supabase/supabase-js` — trois paquets, aucun autre. Pas de router, pas de state manager, pas de kit UI. C'est un choix assumé (cf. commentaires du code), pas un oubli — à respecter dans toute évolution.

**Trois couches strictement séparées** :

1. **`src/domain/`** — logique métier pure, sans dépendance React ni Supabase : `types.ts` (types de données), `workspace.ts`, `move-action.ts`, `edit-action.ts`, `add-note.ts`, `link-action.ts`. Chaque mutation métier est une fonction pure `(état, params) → nouvel état`.
2. **`src/presets/`, `src/calendar/`, `src/recurrence/`, `src/reminders/`, `src/migration/`** — modules de règles également purs (préréglages métier, calendrier ISO, récurrence, relances, migration de données héritées).
3. **`src/app/`** — la couche React : `adapters/` (persistance), `screens/`, `components/`, `hooks/`, `utils/`.

**Pattern reducer partagé** (`app-reducer.ts`) : un seul reducer pur (`appReducer`, ~320 lignes, 22 cas d'événements typés `AppEvent`) consommé par **deux adaptateurs interchangeables** exposant le même contrat `StoreContextValue` (`store-context.ts`) :

- `TemporaryStoreProvider` — en mémoire, utilisé quand Supabase n'est pas configuré et par tous les tests d'écran.
- `SupabaseStoreProvider` (666 lignes, le plus gros fichier du projet) — persistance réelle. Écriture optimiste : le reducer applique l'événement localement, puis une closure réplique vers Supabase en tâche de fond (`dispatchAndPersist`/`dispatchAndPersistAction`/`trackPersist`).

Changer d'adaptateur ne touche qu'`App.tsx` (`isSupabaseConfigured() ? SupabaseStoreProvider : TemporaryStoreProvider`) — l'objectif de découplage est atteint.

**Navigation** : pas de router, une machine à états `Route` (union discriminée, 14 écrans) dans `App.tsx`, pilotée par `useState`. `routeToTab()` mappe chaque route vers l'onglet actif de la barre basse. Fonctionne bien pour une app à profondeur de navigation faible (2 niveaux max), mais le "back" du navigateur ne fait rien (pas d'historique, pas d'URL) — acceptable pour une PWA mobile-first sans besoin de partage de lien profond, à documenter comme limite assumée plutôt qu'oubli si jamais soulevé.

**Isolation multi-appareil** : header `x-user-hash` (pas de Supabase Auth), policy RLS identique sur toutes les tables `projets_*`.

## Fonctionnalités existantes

- Espaces RUN (continu) / PROJET (à étapes), avec 6 "approches métier" (préréglages de champs visibles/filtres/phases) : `simple`, `it_ops`, `project_amoa`, `product_tech`, `management`, `client_web`.
- Actions : titre, statut (4), priorité (3), type (8 : tâche/demande/incident/maintenance/livrable/jalon/décision/risque), planification à granularité unique (jour/semaine/mois/aucune), notes horodatées, lien vers une autre action, tags.
- Vues transversales Aujourd'hui / Semaine (agrège tous les espaces), Rappels (relances actives), Recherche, Hub (compteurs + objectifs business déclaratifs).
- Kanban desktop par phase (drag & drop HTML5 natif) pour les espaces PROJET ; vue RUN Aujourd'hui/Semaine avec filtres rapides.
- Swipe mobile (terminer / replanifier) sur les cartes d'action, toujours doublé d'un équivalent non-gestuel.
- Carnet : capture rapide de notes libres, conversion en action différée.
- Récurrence (règles quotidien/hebdo/mensuel, matérialisation d'occurrences).
- Relances "en attente" avec délai configurable + notifications Web Push.
- File de mutations en attente avec détection de conflit explicite au retry (pas d'écrasement silencieux) et badge de synchronisation par carte.
- Réglages : thème (système/clair/sombre), personnalisation de la 2ᵉ destination de la barre basse, code de synchronisation multi-appareil, export JSON.
- Skeleton de chargement à hauteur stable, safe-areas iOS/Android, `prefers-reduced-motion` respecté partout.

## Ce qui fonctionne bien

- **Séparation domaine/persistance/UI réellement respectée**, pas juste nominale : le domaine ne connaît ni React ni Supabase, vérifiable par les imports.
- **Deux adaptateurs au contrat identique** : permet de développer et tester sans jamais toucher à Supabase (tous les tests d'écran tournent sur `TemporaryStoreProvider`).
- **Discipline de test forte** : 257 tests, aucun marqueur TODO/FIXME dans le code source, des tests qui rejouent des races corrigées (déplacement + relance simultanés, deux sauvegardes rapprochées) plutôt que de les documenter seulement en commentaire.
- **Aucun blocage artificiel** : `isRecommendedApproach` n'est qu'un avertissement, jamais une contrainte — changer d'approche ne modifie jamais les actions existantes (garanti par construction : `changeWorkspaceApproach` ne connaît même pas les actions).
- **Mobile-first cohérent** : cibles tactiles ≥44px, `aria-current`/`aria-selected` sur les états actifs, annonceur vocal dédié (`a11y/announcer.tsx`), animations désactivables.
- **Empreinte de dépendances minimale** — surface d'attaque et coût de maintenance faibles.
- **File de retry + conflit explicite** (Lot 3) : pattern rare dans une app de cette taille, bien testé (retry après reconnexion, conflit bloquant un écrasement).

## Frictions UX

Reprises et complétées depuis `docs/mobile-product-audit.md` :

| Friction | Détail |
| --- | --- |
| Pas de vrai mode hors-ligne | La file de retry (Lot 3 §1) couvre la panne réseau courte pendant que l'onglet reste ouvert ; rien ne survit à la fermeture de l'app/l'onglet (pas de persistance locale des mutations en attente). |
| Deux systèmes de cartes d'action | `ActionCard` (mobile/listes) et `KanbanCard` (desktop) affichent des informations quasi identiques avec deux implémentations distinctes du menu, des chips et de la mise en page — toute évolution visuelle doit être répercutée deux fois. |
| `collaborationMode`/`assigneeIds` non exploités | Champ modélisé (`Workspace.collaborationMode: "solo" \| "team"`, `Action.assigneeIds: string[]`) sans aucune UI de lecture ni d'écriture — l'utilisateur ne peut jamais le voir ni le changer. Le préréglage `management` référence même un champ `assignee` dans `visibleFields` qui n'existe nulle part dans l'UI. |
| Navigation sans historique | Changer d'écran ne pousse rien dans l'historique du navigateur ; un retour arrière physique/geste quitte l'app plutôt que de revenir à l'écran précédent. |
| Skeleton uniquement au chargement initial | Les listes qui se rafraîchissent après une mutation n'ont pas d'état de chargement intermédiaire (l'optimisme du reducer masque généralement le besoin, mais un retry après conflit déclenche un `load()` complet sans retour visuel dédié). |

## Dette produit

- **`collaborationMode` et `assigneeIds`** : à assumer explicitement comme hors-scope (les retirer du modèle) ou à livrer une UI minimale — l'état actuel (champ présent, jamais actionnable) est la pire des deux options : coût de maintenance sans valeur perçue.
- **Barre basse personnalisable à une seule case** (Lot 3 §3) : le point d'audit prévoyait de choisir entre plusieurs destinations (Rappels, Recherche, Carnet) ; seul le binôme Semaine/Rappels est livré. Décision cohérente avec l'effort investi, mais à documenter comme un choix de portée réduite plutôt qu'un oubli si le sujet revient.
- **Lot 2 partiellement traité** : swipe terminer/replanifier livré ; densité de carte (compacte/confortable) et bouton d'ajout contextuel depuis Aujourd'hui/Semaine restent à faire (`docs/dev-handoff-codex.md`).
- **Lot 3 partiellement traité** : file de mutations, badge de sync et personnalisation navigation livrés ; réconciliation multi-device au-delà d'une seule édition hors-ligne consécutive reste une limite documentée, pas résolue.

## Dette technique

- **`SupabaseStoreProvider` : 666 lignes, un seul fichier.** Toutes les mutations (create/edit/move/delete pour 5 ressources) y vivent côte à côte. Fonctionnel et déjà bien factorisé en interne (`trackPersist`, `queuePersist`, `dispatchAndPersistAction`), mais la taille rend la revue de PR plus lourde qu'elle ne devrait l'être — candidat naturel à un découpage par ressource (voir plan de migration).
- **Schéma Supabase partiellement versionné.** Le dépôt ne contient que 2 fichiers de migration (`20260910_hub_settings.sql`, `20260910_push_reminders.sql`). Les tables `projets_workspaces`, `projets_actions`, `projets_carnet_notes`, `projets_recurrence_rules` — le cœur du schéma — n'ont **aucune migration versionnée dans le dépôt** : elles ont été créées directement en base. Risque réel de dérive schéma/code non détectable en revue, et impossibilité de reconstruire l'environnement depuis zéro à partir du dépôt seul.
- **CSS monolithique.** `global.css` fait 1 967 lignes, 217+ sélecteurs de classe, sans scoping par composant (CSS Modules, styled-components ou équivalent). Le risque de collision de noms augmente avec chaque nouvelle fonctionnalité ; déjà des classes proches (`.action-sub` réutilisée par `ActionCard` et `KanbanCard` avec des significations légèrement différentes).
- **Duplication de mise en page "segmented control".** Le même pattern d'onglets à curseur animé (`RunWorkspaceScreen` Aujourd'hui/Semaine, `ProjectWorkspaceScreen` Par étapes/Par semaine) est réimplémenté deux fois avec un JSX quasi identique plutôt que factorisé en composant partagé.
- **Migration LEGACY_PHASE_COLUMNS.** `ProjectWorkspaceScreen.tsx` porte une table de correspondance en dur (`ateliers→conception`, `realisations→realisation`, etc.) pour absorber un changement de nomenclature de phases antérieur. Fonctionne, mais s'accumule silencieusement à chaque renommage de phase futur si le même schéma est repris.
- **`useIsDesktop` en re-rendu conditionnel plutôt qu'en CSS.** La bascule desktop/mobile de `BottomNav` est faite en JS (`useIsDesktop()` + rendu conditionnel de branches JSX entières), dupliquant le seuil déjà présent en CSS (`@media (min-width: 1024px)`) — deux sources de vérité pour le même seuil, déjà source d'un bug corrigé en session (icônes desktop dans le DOM mobile).
- **Pas de linter/formatter de style (Prettier) configuré.** Le code est correctement formaté à la main, mais rien ne le garantit en CI — une PR mal indentée passerait le lint sans être détectée (déjà observé une fois pendant cette session sur une insertion automatisée).

## Éléments réutilisables

- `BottomSheet` — base commune à toutes les feuilles modales (`AddActionSheet`, `EditActionSheet`, `MoveActionSheet`, `NotesSheet`, `LinkActionSheet`, `ConvertNoteSheet`, `FilterSheet`), gère focus trap, restauration du focus, fit au clavier virtuel. Bon socle, à continuer d'utiliser pour toute nouvelle feuille.
- `ActionMenuSheet` — menu d'actions unique (Notes/Lien/Éditer/Déplacer/Supprimer) déjà partagé entre `ActionCard` et `KanbanCard` : preuve que la duplication des deux cartes n'est pas totale, juste partielle.
- `useMoveWithUndo` / `useDeleteWithUndo` — hooks d'annulation (fenêtre 8s, `UndoBanner`), déjà réutilisés dans les 6 écrans qui affichent des actions. Pattern à répliquer pour toute nouvelle mutation destructive.
- `PRESET_REGISTRY` — point d'extension unique et déjà éprouvé pour ajouter une approche métier (le template `client_web` de cette session ne l'a pas modifié, juste étendu).
- `useActionSyncStatus` / `resolveSyncStatus` (prop-resolver plutôt que dépendance directe au store) — bon exemple à suivre : garde `ActionListSection`/`ActionCard` testables sans `StoreProvider` tout en leur donnant accès à une donnée dérivée du store.
- Modules purs du domaine (`move-action.ts`, `edit-action.ts`, `filter-actions.ts`, `calendar-engine.ts`) — aucune dépendance, 100% testables unitairement, à prendre comme modèle pour toute nouvelle règle métier.

## Éléments à supprimer

- **`src/migration/migrate-legacy-actions.ts`** (+ son test) — exporté depuis `src/index.ts` mais jamais appelé par l'application réelle (`App.tsx`, les adaptateurs). Sert uniquement à convertir un format d'action antérieur au `Schedule` unique actuel. À confirmer avec l'historique : si aucune donnée en production n'est plus dans l'ancien format, ce module est mort et peut être retiré (avec son export du barrel `src/index.ts`) ; sinon, le documenter explicitement comme "outil de migration ponctuelle", pas comme code applicatif.
- **`collaborationMode` sur `Workspace` et `assigneeIds` sur `Action`** — si la décision produit est de ne pas construire de mode équipe à court terme, retirer ces champs (et le "assignee"/"byAssignee"/"blocked" du préréglage `management`) plutôt que de les laisser comme dette silencieuse. Sinon, les garder mais planifier l'UI correspondante (voir plan de migration).

## Éléments à refactorer

1. **Extraire un composant `SegmentedTabs`** partagé pour le pattern onglet-à-curseur-animé (actuellement dupliqué dans `RunWorkspaceScreen` et `ProjectWorkspaceScreen`). Risque faible, gain immédiat en cohérence visuelle future.
2. **Fusionner `ActionCard` et `KanbanCard`** derrière une seule implémentation avec un mode d'affichage (`variant: "list" | "kanban"`) plutôt que deux composants. `ActionMenuSheet` est déjà factorisé ; le reste (titre, chips, notes/lien, badge de sync) peut suivre le même chemin sans changement de comportement visible.
3. **Découper `SupabaseStoreProvider`** par ressource (`useWorkspacePersistence`, `useActionPersistence`, `useCarnetPersistence`, etc.), chacun exposant un sous-ensemble du contrat `StoreContextValue`, assemblés dans le provider. Réduit la taille de fichier sans changer l'API publique (`useStore()` reste identique côté consommateurs).
4. **Committer le schéma Supabase manquant** : générer les migrations `create table` pour `projets_workspaces`, `projets_actions`, `projets_carnet_notes`, `projets_recurrence_rules` à partir de l'état actuel de la base (`supabase db dump` ou équivalent), pour que le dépôt redevienne la source de vérité complète du schéma.
5. **Unifier le seuil desktop/mobile** : soit piloter `BottomNav` entièrement par CSS (deux blocs toujours dans le DOM, l'un masqué par media query — au prix d'une duplication DOM déjà écartée pour des raisons d'accessibilité), soit lire le seuil CSS depuis une seule constante partagée (`--desktop-breakpoint` exposée en JS via `getComputedStyle`) pour éliminer la deuxième source de vérité.

## Plan de migration proposé

Aucune réécriture totale n'est justifiée : l'architecture (domaine pur / adaptateurs interchangeables / reducer partagé) est saine et récente, la dette identifiée est localisée et chaque point ci-dessus se traite indépendamment, sans bloquer les autres. Migration strictement incrémentale, priorisée par risque et effort :

**Étape 1 — Combler les risques silencieux (effort faible, risque élevé si ignoré)**
1. Committer les migrations Supabase manquantes (point 4 ci-dessus) — pas de changement de comportement, élimine un vrai risque de dérive.
2. Décider explicitement du sort de `collaborationMode`/`assigneeIds` (retrait ou UI minimale) et de `migrate-legacy-actions.ts` (retrait ou documentation) — décision produit avant tout travail de code.

**Étape 2 — Réduire la duplication existante (effort moyen, gain de maintenabilité)**
3. Extraire `SegmentedTabs`.
4. Fusionner `ActionCard`/`KanbanCard` derrière un variant, écran par écran, en gardant les tests existants verts à chaque étape (pas de big-bang : commencer par un seul écran, valider, puis étendre).

**Étape 3 — Réduire la taille des fichiers critiques (effort moyen, risque de régression à surveiller)**
5. Découper `SupabaseStoreProvider` par ressource, une ressource à la fois (ex. `carnet` d'abord — le plus petit — puis `hub-settings`, `recurrence`, `workspaces`, `actions` en dernier car le plus gros et le plus testé).

**Étape 4 — Finir le backlog produit déjà cadré**
6. Lot 2 restant (densité de carte, bouton d'ajout contextuel).
7. Lot 3 restant (réconciliation multi-édition hors-ligne, si le besoin se confirme en usage réel).

Chaque étape est indépendamment livrable et testable ; aucune ne requiert de geler les autres chantiers en cours.
