# Product Renewal — Bilan final

Document de clôture du chantier "Product Renewal" (10 lots, `docs/AUDIT.md`
→ `docs/PRODUCT-RENEWAL-SPEC.md` → `docs/PRODUCT-RENEWAL-IMPLEMENTATION-PLAN.md`
→ ce document). Référence produit à jour ; pour le détail d'exécution du
dernier lot (code mort retiré, audit contraste, préparation merge), voir
`docs/LOT10-CLOSURE.md`.

## 1. Vision finale

INDXONE Projets est un outil de gestion d'actions et de projets RUN/PROJET,
mobile-first, aussi léger et immédiat que Columns.app, capable d'organiser
du travail structuré (phases, statuts, responsables) sans jamais imposer la
complexité d'un ClickUp. Le renouveau a resserré la navigation, unifié les
composants dupliqués, ajouté un statut `blocked`, une vue Home orientée
priorité (Aujourd'hui/En retard/Bloqué/Semaine), et une collaboration
légère (V1) sans jamais introduire de compte utilisateur ni d'authentification
supplémentaire.

## 2. Architecture fonctionnelle

Trois couches strictement séparées, inchangées depuis l'audit initial :

1. **`src/domain/`** (+ `src/presets/`, `src/calendar/`, `src/recurrence/`,
   `src/reminders/`) — logique métier pure, sans React ni Supabase. Chaque
   mutation est une fonction `(état, params) → nouvel état`.
2. **`app-reducer.ts`** — un seul reducer pur, ~30 types d'événements,
   consommé par les deux adaptateurs.
3. **`src/app/`** — React : `adapters/` (persistance), `screens/`,
   `components/`, `hooks/`, `utils/`.

**Deux adaptateurs interchangeables**, même contrat `StoreContextValue` :
`TemporaryStoreProvider` (mémoire, tests + démo sans Supabase configuré) et
`SupabaseStoreProvider` (persistance réelle, écriture optimiste + file de
retry). Basculer de l'un à l'autre ne touche qu'une ligne dans `App.tsx`.

Dépendances de production : `react`, `react-dom`, `@supabase/supabase-js` —
**inchangées sur les 10 lots**, aucun router, aucun state manager, aucun kit
UI.

## 3. Navigation

4 destinations primaires identiques mobile/desktop : **Accueil**, **Projets**,
**Cette semaine**, **Rappels** (barre basse mobile / sidebar desktop). Menu
secondaire (Carnet, Hub, Approches métier, Recherche, Réglages) accessible
via un bouton dédié. Pas de router, une machine à états `Route` pilotée par
`useState` — pas d'historique navigateur, limite assumée dès l'audit initial
(PWA mobile-first sans besoin de lien profond).

## 4. RUN vs PROJET

- **RUN** (travail continu) : vues Aujourd'hui/Cette semaine, filtres
  rapides, pas de notion de phase.
- **PROJET** (à étapes) : vue Colonnes (par phase) ou Semaine, phases issues
  du préréglage d'approche métier (6 préréglages : simple, it_ops,
  project_amoa, product_tech, management, client_web).

Les deux partagent : `ActionCard` (variant list/kanban), `ActionDetailSheet`,
`FilterSheet` (statuts/priorités/type + Responsable en mode Équipe),
`SegmentedTabs` (extrait en composant partagé au Lot 6).

## 5. Home

Ordre fixe : **Aujourd'hui → En retard → Bloqué → Semaine**, chaque section
n'affichant une action qu'une seule fois (pas de duplication entre
sections, vérifié par test). Pas de dashboard ni de compteurs ajoutés au-delà
de ce qui existait (choix du Lot 7, reconfirmé au Lot 9 — "preuve UX forte"
non apportée).

## 6. Columns

Vue canonique unique (remplace l'ancien Kanban desktop et l'ancienne vue
mobile "par étapes", fusionnés au Lot 3) : colonnes côte à côte desktop,
scroll horizontal natif + scroll-snap mobile — même implémentation, bascule
purement CSS. Création rapide inline par colonne (Lot 4), drag & drop HTML5
desktop, alternative clavier/clic via le menu "…" de chaque carte (jamais
DnD-only).

## 7. ActionDetail

Sheet unique (`ActionDetailSheet`) remplaçant 7 chemins d'édition dispersés
avant le Lot 5 — plein écran mobile, drawer desktop (420px). Sections :
Statut, Priorité, Type, Échéance, Phase, **Responsable** (mode Équipe
uniquement, prop groupée `collaboration`), Notes, Lien, Déplacer, Supprimer.
Audité pour densité au Lot 9 : jugé conforme, pas de refactor de props
nécessaire (chaque prop correspond à un axe métier indépendant documenté).

## 8. Collaboration V1

Décision produit tranchée au Lot 8A, validée explicitement par l'utilisateur
avant implémentation :

> Les membres sont des étiquettes d'organisation internes au workspace. Ils
> ne représentent PAS des comptes utilisateurs distincts.

- **Solo** par défaut ; **Équipe** activable dans les réglages d'un espace.
- Membres : ajout, renommage, désactivation — **jamais de suppression
  physique** (une action déjà assignée ne perd jamais silencieusement son
  responsable ; un membre désactivé reste affiché avec l'étiquette
  "Inactif" mais n'est plus proposable pour une nouvelle assignation).
- Assignation depuis ActionDetail, indicateur compact sur `ActionCard`
  (max 2 initiales + "+N", invisible en Solo), filtre Responsable dans
  RUN et PROJET.
- Copy UI strictement limité à "membre"/"responsable"/"équipe" — jamais
  "compte"/"utilisateur invité"/"rôle"/"accès"/"permission".

## 9. Limites connues

- Pas de vrai compte utilisateur ni d'authentification — voir §10.
- Pas de mode hors-ligne durable : la file de retry couvre une coupure
  réseau courte pendant que l'onglet reste ouvert, rien ne survit à la
  fermeture de l'onglet.
- Navigation sans historique navigateur (pas d'URL profonde).
- Home ne propose pas de vue "toutes les vues transversales" avec
  assignation/filtre Responsable (Aggregated/Reminders/Search/ByStatus non
  étendus au Lot 8B/8.1, décision explicite pour limiter la complexité du
  modèle transversal).

## 10. Sécurité actuelle

**Modèle x-user-hash, pas d'authentification réelle** : un `crypto.randomUUID()`
généré côté client, stocké en `localStorage`, envoyé en en-tête
`x-user-hash`. Les policies RLS Postgres filtrent sur ce header
(`current_setting('request.headers')::json ->> 'x-user-hash'`). C'est un
**secret partagé côté client**, pas une identité vérifiée serveur : quiconque
connaît ou devine le hash d'un autre appareil peut usurper son accès. Documenté
en détail dans `docs/LOT8A-COLLABORATION-SECURITY.md`. C'est précisément
pour cette raison que la collaboration V1 (§8) n'implémente **aucun compte
distinct** — construire une UI "équipe" multi-comptes sur ce modèle aurait
été trompeur pour l'utilisateur final.

Avertissements Supabase connus (non liés au renouveau, pré-existants) :
extension `pg_net` en schéma public, fonction `push_public_key()` en
`SECURITY DEFINER` exécutable publiquement (probablement volontaire pour une
clé publique VAPID), policies RLS avec `current_setting()` non enveloppé en
sous-requête (impact performance à l'échelle, pas de sécurité) — voir
`docs/LOT10-CLOSURE.md` Phase G pour le détail.

## 11. Dette restante

Voir `docs/LOT10-CLOSURE.md` (Phase G) pour le tableau complet
avant/après. Résumé :

- `SupabaseStoreProvider` a grossi (666 → 729 lignes) plutôt que d'être
  découpé par ressource — jamais entrepris, aucun lot n'avait cette portée.
- `global.css` a grossi (1967 → 2134 lignes), toujours monolithique —
  refactor CSS Modules explicitement hors scope de tous les lots.
- Seuil desktop/mobile (1024px) dupliqué CSS/JS (`useIsDesktop` via
  `matchMedia`), jamais unifié en source unique.
- `--color-danger` en petit texte de bouton et `--color-accent` en texte
  sur fond sombre en dark mode restent sous l'AA strict (texte normal) —
  passent le seuil "grand texte/UI" (3:1), non corrigés pour limiter le
  rayon d'impact visuel (tokens multi-usages).
- Pas de Prettier/formatter configuré.

## 12. Décisions reportées

- Refactor `SupabaseStoreProvider` par ressource (recommandé dès l'audit
  initial, jamais priorisé face au backlog fonctionnel).
- Unification du seuil desktop/mobile CSS/JS en une seule source de vérité.
- Durcissement AA strict de `--color-danger`/`--color-accent` sur tout
  texte (actuellement conformes au seuil "grand texte/UI" uniquement).
- Revue sécurité dédiée des avertissements Supabase pré-existants
  (`pg_net`, `push_public_key()` SECURITY DEFINER).
- Migration de données qui réécrirait `phase_id` legacy vers son équivalent
  actuel pour permettre, un jour, le retrait de `LEGACY_PHASE_ALIASES`
  (actuellement utilisé par 40% des actions de production).
- Extension éventuelle de l'assignation/filtre Responsable aux vues
  transversales (Home, Semaine agrégée, Recherche) — non demandée, jugée
  hors scope V1 de la collaboration légère.

## 13. Procédures de validation

- **Automatisée** : `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
  (400 tests), `npm run build` — à exécuter avant tout merge.
- **Navigateur réelle** : Playwright Python installé en session (jamais en
  dépendance projet), Chromium pré-installé de l'environnement, headless,
  desktop + mobile. Checklist manuelle stable documentée dans
  `docs/LOT10-CLOSURE.md` (Phase E) pour toute validation humaine future
  sans dépendance ajoutée.
- **Sécurité/schéma Supabase** : `mcp__Supabase__get_advisors` (security +
  performance) et vérification directe des colonnes/valeurs réelles en base
  avant toute décision de suppression de code lié aux données (méthode
  appliquée à `migrate-legacy-actions.ts` et `LEGACY_PHASE_ALIASES` ce lot).

## 14. Prochaines évolutions possibles (hors Lot 10, non engagées)

- Authentification réelle (Supabase Auth) si la collaboration doit un jour
  dépasser le stade "étiquettes" vers de vrais comptes distincts par
  personne.
- Mode hors-ligne durable (persistance locale des mutations en attente au-delà
  de la durée de vie de l'onglet).
- Découpage de `SupabaseStoreProvider` par ressource.
- Vue transversale unifiée avec responsable/filtre (si le besoin utilisateur
  se confirme en usage réel, cf. §12).
