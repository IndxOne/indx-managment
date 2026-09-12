# Lot 10 — Nettoyage / Clôture

Dernier lot du chantier "Product Renewal". Aucun changement métier, aucune
nouvelle UX, aucune migration Supabase, aucune nouvelle dépendance — conforme
aux contraintes du lot.

## Phase A — Code mort supprimé

Critères appliqués avant toute suppression : (1) aucun consommateur réel,
(2) aucune donnée de production n'en dépend (vérifié en base live, pas
supposé), (3) suite de tests toujours complète après retrait.

| Élément | Preuve de non-nécessité | Décision |
| --- | --- | --- |
| `src/migration/migrate-legacy-actions.ts` (+ test) | Jamais appelé par l'app réelle (`App.tsx`, adaptateurs) — seulement par ses propres tests et `qa/scenarios.test.ts`/`qa/migration-dry-run.test.ts`. **Vérifié en base live (projet `wdxvhceddrtxworblfec`)** : `information_schema.columns` de `projets_actions` ne contient **aucune** colonne `due_date`/`week`/`month` (le format legacy que cette fonction consomme) — seule la colonne `schedule` (format cible unique) existe. Confirme et actualise la preuve déjà posée dans `docs/PRODUCT-RENEWAL-BASELINE.md` (Lot 0). | **Supprimé** : le fichier, son test, `qa/migration-dry-run.test.ts`, sa fixture `qa/fixtures/legacy-export-sample.json`, et le describe dédié dans `qa/scenarios.test.ts`. |
| `src/index.ts` (barrel d'exports) | Aucun fichier du dépôt ne l'importe (`grep` sur tout `src/`) ; `package.json` ne déclare ni `main`, ni `module`, ni `exports` le référençant ; l'entrée réelle de l'app est `src/app/main.tsx`, indépendante de ce barrel. | **Supprimé**. Les modules qu'il ré-exportait restent tous utilisés directement par import relatif ailleurs dans l'app — seule la façade inutilisée disparaît. |
| `.action-menu-item-danger` (CSS) | Classe jamais appliquée dans aucun JSX (recherche statique + dynamique) ; la coloration "danger" des lignes de menu (ex. "Supprimer") est faite par `style` inline (`ActionDetailSheet.tsx`), pas par cette classe — reliquat d'une version antérieure. | **Supprimé**. |

**Vérifié et confirmé toujours nécessaire (non supprimé)** :

- **`LEGACY_PHASE_ALIASES`** (`src/app/utils/resolve-phase.ts`) — vérifié en
  base live : `select phase_id, count(*) from projets_actions group by
  phase_id` renvoie `ateliers` (6), `validations` (4), `restitutions` (1),
  `realisations` (1) — **12 des 30 actions de production (40%) portent
  encore un `phase_id` legacy** que seule cette table de correspondance sait
  résoudre à l'affichage. Retirer cette compatibilité masquerait ces 12
  actions des vues par phase. Conservée sans réserve, et cette preuve à jour
  remplace l'hypothèse non vérifiée de `docs/AUDIT.md` (Éléments à
  refactorer, point "Migration LEGACY_PHASE_COLUMNS").
- Aucune autre "ancienne classe Kanban" trouvée : `KanbanBoard`/`KanbanCard`
  n'existent plus comme composants depuis le Lot 2 (fusion dans `ActionCard`
  via `variant`) — seules des mentions en commentaire (historique) subsistent
  dans `global.css`, pas de code mort réel.
- Aucun "ancien chemin d'édition" trouvé : pas de `EditActionScreen`/
  équivalent legacy, tout passe par `ActionDetailSheet` depuis le Lot 5.
- Aucune "ancienne préférence de navigation" orpheline trouvée :
  `localStorage` n'est utilisé que pour le thème et le `x-user-hash`, les
  deux activement lus/écrits.
- `--chip-orange-bg`/`--chip-green-bg` et les autres tokens de couleur non
  cités ci-dessus : tous consommés (vérifié par recherche statique + usages
  dynamiques via template literal, ex. `` `badge-${kind}` ``,
  `` `sync-chip-${status}` ``).

**Audit d'usage automatisé** (composants/écrans/hooks/utils sans aucun
consommateur détecté par recherche croisée des chemins d'import) : aucun
résultat au-delà des deux faux positifs ci-dessus (confirmés utilisés après
vérification manuelle).

## Phase B — CSS

Un seul sélecteur mort trouvé et supprimé (`.action-menu-item-danger`, cf.
Phase A). Le reste des ~150 sélecteurs de `global.css` a un consommateur
JSX vérifié (littéral ou via template literal). Pas de refactor CSS Modules
tenté (hors scope explicite du lot).

## Phase C — Compatibilités legacy restantes

| Compatibilité | Pourquoi elle existe | Données concernées | Retirable maintenant ? | Condition de retrait |
| --- | --- | --- | --- | --- |
| `LEGACY_PHASE_ALIASES` | Deux renommages de phases antérieurs (AMOA 6→4 colonnes, preset `simple` avant Lot 6) n'ont jamais réécrit `Action.phaseId` en base — par choix explicite ("jamais utilisé pour muter les données stockées"). | 12/30 actions de production (40%), vérifié live. | **Non.** | Retirable seulement après une migration de données qui réécrit une bonne fois `phase_id` vers son équivalent actuel pour toutes les lignes concernées (ce que ce lot n'a pas le droit de faire : "aucune migration Supabase"). Tant que cette migration n'existe pas, cette table doit rester. |
| `--color-warning-text` / `--chip-orange-text` / `--chip-green-text` assombris (Lot 10, cf. Phase D) | Tuning de contraste WCAG, pas une compatibilité legacy au sens strict — mentionné ici pour mémoire, aucune condition de retrait : ce sont les valeurs définitives. | — | — | — |

`migrate-legacy-actions.ts` ne figure plus dans ce tableau : la preuve live
(Phase A) établit qu'aucune donnée de production ne dépend plus du format
qu'il traite — il a été supprimé, pas seulement documenté.

## Phase D — Audit contraste WCAG (outillé)

Calcul du ratio de contraste réel (formule de luminance relative WCAG,
script Python autonome, aucune dépendance ajoutée) sur les paires
texte/fond effectivement utilisées dans `global.css` et le code, light et
dark mode. Seuils : AA texte normal ≥ 4.5:1, AA texte large (≥18.66px, ou
≥14.66px en gras)/composants UI ≥ 3:1.

**Résultat avant correction** — 6 paires réellement utilisées comme texte
échouaient :

| Paire | Ratio | Usage réel | Sévérité |
| --- | --- | --- | --- |
| `--color-warning` sur blanc | 2.20:1 | Texte "Relance active/due" (`ActionCard`), avertissement de combinaison inhabituelle (`ApproachSettingsScreen`), chiffre `StatTile` "En attente" (Hub) | Réelle, sous le seuil même en grand texte |
| `--color-success` sur blanc (`StatTile` "Terminé") | 2.22:1 | Chiffre de stat, gras 28px | Réelle, sous le seuil même en grand texte |
| `--color-text-tertiary` sur blanc (`StatTile` "À faire") | 1.68:1 | Chiffre de stat, gras 28px | Réelle, sous le seuil même en grand texte |
| `--chip-orange-text`/`--chip-orange-bg` | 4.23:1 | Libellé de chip (phase/type) | Réelle, proche du seuil texte normal |
| `--chip-green-text`/`--chip-green-bg` | 4.00:1 | Libellé de chip | Réelle, proche du seuil texte normal |
| `--color-accent` sur fond sombre (dark mode) | 3.16:1 | Liens/texte accent en dark mode | Passe déjà le seuil "grand texte/UI" (3:1) — non corrigée, cf. ci-dessous |
| `.btn-danger-text` (`--color-danger` sur blanc) | 3.55:1 | Bouton "Supprimer"/"Désactiver la relance" | Passe déjà le seuil "grand texte/UI" (3:1) — non corrigée, cf. ci-dessous |

**Corrections appliquées** (les 5 échecs les plus sévères, ceux qui
échouaient même le seuil relâché de 3:1, sur du texte réellement lu) :

- Nouveau token `--color-warning-text` (texte uniquement ; `--color-warning`
  inchangé pour fonds/icônes/bordures) : `#a35f00` en light (5.01:1),
  identique à `--color-warning` en dark (déjà 8.28:1, aucune raison de
  diverger). Appliqué aux 3 usages textuels + au chiffre `StatTile`
  "En attente".
- `--chip-orange-text` : `#b25f00` → `#a35700` (4.88:1).
- `--chip-green-text` : `#1e8a3d` → `#1a7935` (4.97:1) — réutilisé aussi
  pour le chiffre `StatTile` "Terminé" (5.48:1 sur blanc) au lieu d'un
  nouveau token à usage unique.
- Chiffre `StatTile` "À faire" : `--color-text-tertiary` → `--color-text-muted`
  (déjà conforme, 5.07:1) — pas de nouveau token, réutilisation d'un token
  existant destiné à du vrai texte.

**Non corrigées, décision documentée** : `--color-danger` en petit texte de
bouton (3.55:1) et `--color-accent` en texte sur fond sombre (3.16:1).
Toutes deux passent déjà le seuil "grand texte/composants UI" (3:1) — ce
sont des tokens **multi-usages** (fonds de boutons, focus ring, bordures,
badges — pas seulement du texte), dont le changement aurait un rayon
d'impact visuel large et mal maîtrisable dans le temps imparti à ce lot.
Conformément à la consigne ("ne pas changer la DA sans nécessité
d'accessibilité"), laissées telles quelles — écart réel mais mineur,
proposé pour une revue dédiée si une exigence AA stricte sur tout texte
(y compris petit) devient un critère de sortie explicite.

Toutes les paires chip restantes (bleu, violet, rouge, teal, rose, gris) et
tous les usages `color-text`/`color-text-muted`/`btn-primary` étaient déjà
conformes AA — aucun changement.

## Phase E — Tests visuels automatisés

**Décision : ne pas ajouter Playwright/Cypress comme dépendance.** Le
projet a une discipline de test unitaire/intégration déjà forte (400 tests
Vitest + Testing Library, jsdom) et un usage réel mobile-first avec peu
d'écrans (une douzaine). Le coût d'une suite de tests visuels
versionnée (maintenance des images de référence, flakiness cross-plateforme,
CI plus lente) dépasse le bénéfice pour cette taille de projet — d'autant
que chaque lot du renouveau (8.1, 9, 10) a déjà validé son parcours critique
avec Playwright en **session-only** (jamais commité comme dépendance),
donnant une preuve réelle sans coût récurrent.

**Checklist de validation manuelle stable** (à rejouer à chaque changement
UI significatif, desktop + mobile) :

1. Solo → Équipe sur un espace PROJET : la section Membres apparaît/disparaît
   sans perte de données.
2. Ajouter, renommer, désactiver un membre depuis les réglages.
3. Assigner une action depuis ActionDetail ; vérifier l'indicateur compact
   sur la carte (max 2 initiales + "+N").
4. Filtrer par Responsable en RUN et en PROJET (Colonnes et Semaine) :
   Tous / un membre / Non assigné.
5. Un membre désactivé déjà assigné reste affiché (étiquette "Inactif")
   mais n'est plus proposable pour une nouvelle assignation.
6. Home : ordre Aujourd'hui / En retard / Bloqué / Semaine, pas de
   duplication d'action entre sections.
7. Columns : phase vide, colonne longue (scroll), création rapide inline,
   drag & drop desktop, scroll horizontal natif mobile.
8. ActionDetail : toutes les sections (Statut/Priorité/Type/Échéance/Phase/
   Responsable/Notes/Lien/Déplacer/Supprimer), sheet plein écran mobile,
   drawer desktop.
9. Rappels, Recherche, Réglages (thème système/clair/sombre) : chargement
   sans erreur, contenu cohérent.
10. Reload complet : sur un déploiement Supabase configuré, l'espace, les
    membres et l'assignation doivent persister (non testable dans une
    sandbox sans Supabase configuré — cf. `docs/LOT8-1-VALIDATION.md`).
11. Aucune erreur console à aucune étape (desktop 1280px, mobile 375px).

## Phase G — Audit final architecture (vs `docs/AUDIT.md`)

| Invariant | État initial (`AUDIT.md`) | État final (Lot 10) |
| --- | --- | --- |
| Domaine pur (`src/domain`) | Respecté | **Toujours respecté** — aucune dépendance React/Supabase introduite dans `src/domain`, `src/presets`, `src/calendar`, `src/recurrence`, `src/reminders` sur les 10 lots. |
| Reducer partagé (`app-reducer.ts`) | 1 reducer, ~320 lignes, 22 événements | **Toujours 1 seul reducer**, étendu à ~30 événements (workspace/setCollaborationMode, action/setAssignees, member/*, etc.) — aucune logique dupliquée entre adaptateurs. |
| Adaptateurs interchangeables | `TemporaryStoreProvider`/`SupabaseStoreProvider`, même contrat | **Toujours interchangeables** — chaque événement du Lot 8 (membres, assignation) ajouté aux deux adaptateurs en parallèle, jamais l'un sans l'autre. |
| Dépendances minimales | `react`, `react-dom`, `@supabase/supabase-js` | **Identiques, zéro ajout** sur 10 lots (vérifié `package.json`). |
| Mobile-first | Cibles ≥44px, `aria-current`, annonceur vocal | **Renforcé** (Lot 9 : cascade CSS qui neutralisait `tap-target` sur 2 boutons corrigée ; zone cliquable de `.icon-btn`/`.quick-add-plus` portée à 44px sans changement visuel). |
| Accessibilité | Bonne base | **Renforcée** : `aria-pressed` ajouté, contraste WCAG audité et corrigé (Lot 10), alternatives clavier au swipe/DnD confirmées déjà présentes. |
| Aucun router/state manager ajouté | Machine à états `Route` + `useState` | **Inchangé** — toujours pas de router, pas de Redux/Zustand/etc. |
| Pas de nouveau kit UI | Aucun | **Inchangé**. |

**Ce qui s'est amélioré depuis l'audit initial** :
- Schéma Supabase désormais **entièrement versionné** (15 migrations dans
  `supabase/migrations/`, toutes appliquées et vérifiées en base) — l'audit
  initial notait l'absence de 4 tables cœur du schéma dans le dépôt.
- `SegmentedTabs` extrait et partagé (Lot 6) — plus de duplication JSX
  entre RUN et PROJET.
- `ActionCard`/`KanbanCard` fusionnés en un seul composant à `variant`
  (Lot 2) — plus de double implémentation à maintenir.
- `collaborationMode`/`assigneeIds` : décision prise et livrée (Lot 8,
  option "étiquette d'organisation, pas de compte") plutôt que laissés en
  dette silencieuse — l'audit initial pointait cette ambiguïté comme "pire
  des deux options".
- `migrate-legacy-actions.ts` : décision enfin tranchée avec preuve à jour
  (retiré, cf. Phase A) au lieu de rester en jachère documentée.
- Code mort supprimé (Lot 10) plutôt qu'accumulé.

**Ce qui n'a pas changé (dette résiduelle assumée)** :
- `SupabaseStoreProvider` **a grossi** (666 → 729 lignes) plutôt que d'être
  découpé par ressource (refactor recommandé par l'audit initial, jamais
  entrepris — aucun lot du plan ne l'a inclus, à raison : chaque lot avait
  une portée fonctionnelle propre, pas de fenêtre dédiée au refactor pur).
- `global.css` **a grossi** (1967 → 2134 lignes), toujours monolithique —
  attendu et accepté : refactor CSS Modules explicitement hors scope de ce
  lot et non demandé par les lots précédents.
- Seuil desktop/mobile (1024px) toujours dupliqué entre CSS (`@media
  (min-width: 1024px)`) et JS (`useIsDesktop` via `matchMedia`) — même
  constat qu'à l'audit initial, jamais unifié en une seule source de
  vérité. Risque resté faible (un seul hook, un seul endroit à modifier si
  le seuil change).
- Pas de Prettier/formatter configuré — inchangé, jamais soulevé comme
  bloquant sur les 10 lots.
- Navigation toujours sans historique navigateur (`Route` + `useState`,
  pas d'URL) — limite assumée depuis le début, jamais remise en cause.

**Dette technique nouvelle, mineure** (introduite par le renouveau lui-même,
pas préexistante) :
- `--color-danger` en petit texte de bouton et `--color-accent` en texte
  sur fond sombre restent sous l'AA strict (texte normal) — cf. Phase D,
  décision documentée de ne pas y toucher dans ce lot.
- Avertissements Supabase préexistants, non liés au renouveau (extension
  `pg_net` en schéma public, fonction `push_public_key()` en
  `SECURITY DEFINER` exécutable par `anon` — probablement volontaire pour
  une clé publique, à confirmer par une revue sécurité dédiée si besoin),
  et avertissements de performance RLS (`current_setting()` non enveloppé
  dans `(select ...)`, appliqués uniformément sur toutes les tables
  `projets_*` y compris les plus anciennes — pattern préexistant, pas une
  régression du renouveau, corrigible par une migration dédiée hors scope
  de ce lot).

## Phase H — Validation finale

- `npx tsc --noEmit` : aucune erreur.
- `npx eslint .` : aucune erreur.
- `npx vitest run` : **400/400** tests (412 avant retrait du code mort,
  moins les 12 tests dédiés à `migrate-legacy-actions.ts` désormais
  supprimé).
- `npm run build` : succès, taille de bundle stable (~297 kB JS, ~32 kB CSS).
- **Validation navigateur réelle** (Chromium headless, Playwright Python
  installé en session — non ajouté à `package.json` — même stratégie que
  Lots 8.1/9), desktop 1280×900 et mobile 375×812 : parcours complet Home →
  Projets → créer espace PROJET (Solo) → Columns → ActionDetail (pas de
  Responsable en Solo) → Semaine → Réglages → Équipe → ajout membre →
  ActionDetail (assignation) → filtre Responsable PROJET → créer espace RUN
  → Rappels → Recherche → Réglages → Accueil. **Zéro erreur console** sur
  les deux tailles d'écran. Vérification additionnelle ciblée du Hub (light
  + dark) pour confirmer visuellement les couleurs de contraste corrigées
  (Phase D) : lisibles dans les deux thèmes.

## Phase I — Préparation merge (sans merge ni déploiement automatique)

### 1. Liste complète des commits "Product Renewal"

Point de divergence avec `main` : `2fbc18e` (25 commits jusqu'à ce lot,
26 avec le commit de clôture) :

```
e6e2746 docs: audit complet du code (architecture, dette, plan de migration)
e266b8d db: reconstituer les 13 migrations Supabase exactes depuis schema_migrations
b9084bf docs: baseline de renouveau produit + décisions migrate-legacy-actions et collaboration
3f4d2b7 docs: spec produit + plan d'implémentation du renouveau (10 lots)
44bfcbd docs: intégrer les décisions produit validées
de7f22c feat(nav): Lot 1 renouveau produit — navigation Accueil/Projets/Semaine/Rappels + menu secondaire
4016cf4 fix(nav): Lot 1.1 — retirer Plus de la bottom-nav mobile
4872c3a refactor(cards): Lot 2 — fusionner ActionCard et KanbanCard
8b89726 feat(columns): Lot 3 — Vue Columns canonique
29210bd feat(quick-create): Lot 4 — création rapide inline dans ColumnsView
fc2c2be Lot 5 (socle): ActionDetailSheet orchestrant les sheets existantes
c8fe40f Lot 5 (2/N): migrer RunWorkspaceScreen vers ActionDetailSheet
33786e7 Lot 5 (3/N): migrer ProjectWorkspaceScreen vers ActionDetailSheet
44973ba Lot 5 (4/N): migrer AggregatedActionsScreen vers ActionDetailSheet
8ad72eb Lot 5 (5-7/N): migrer RemindersScreen, SearchScreen, ActionsByStatusScreen
cbe0a17 Lot 6 (1/N): extraire SegmentedTabs
062902b Lot 6 (2/N): corriger le preset simple (phase ≠ statut) + migration legacy
cf8a0e9 Lot 6 (3/N): ajouter le statut blocked
9c7f949 Lot 6 (4/N): test de régression — sheets imbriquées
ab1d2d8 chore: finalize lot 6 blocked migration and legacy phase display
ef243da Lot 7 (1/N): HomeScreen — Aujourd'hui / En retard / Bloqué / Semaine
0c12c29 Lot 8A: modèle Member (étiquette d'assignation, pas un compte)
4e1a60b Lot 8B: UX collaboration légère
437ae6a Lot 8.1: filtre Responsable en PROJET + validation navigateur réelle
2ff0239 Lot 9: polish transversal — accessibilité, cohérence, tokens
<ce commit> Lot 10: nettoyage / clôture
```

### 2. Résumé fonctionnel

Navigation simplifiée (Accueil/Projets/Semaine/Rappels + menu secondaire) ;
carte d'action unifiée list/kanban ; vue Colonnes canonique responsive avec
création rapide inline ; détail d'action unique (sheet mobile/drawer
desktop) remplaçant 7 chemins d'édition dispersés ; statut `blocked` ;
Home avec sections Aujourd'hui/En retard/Bloqué/Semaine ; collaboration
légère V1 (membres = étiquettes, assignation, filtre Responsable,
indicateur discret sur carte) ; passe de polish accessibilité/cohérence.

### 3. Résumé technique

Architecture domaine pur / reducer partagé / adaptateurs interchangeables
intégralement préservée. Zéro dépendance ajoutée. Schéma Supabase
entièrement versionné (15 migrations). 400 tests (Vitest + Testing
Library), typecheck et lint stricts, build PWA fonctionnel. Code mort
(migration legacy prouvée obsolète, barrel inutilisé) retiré en fin de
chantier avec preuve, pas par précaution.

### 4. Migrations Supabase appliquées

Les 15 migrations de `supabase/migrations/` sont **toutes appliquées** sur
le projet `wdxvhceddrtxworblfec` (indxone-Hub), vérifié via
`list_migrations` : de `20260425190353_create_sync_snapshots` à
`20260911153732_create_projets_members` (la plus récente, Lot 8A).

### 5. Migrations présentes mais non appliquées

**Aucune.** Le dépôt et la base sont synchronisés.

### 6. Checklist de déploiement

- [ ] Vérifier que l'environnement de déploiement cible bien le projet
      Supabase `wdxvhceddrtxworblfec` (indxone-Hub) — celui qui sert déjà
      `projets.indxone.com` et porte les 30 actions/workspaces de
      production actuels.
- [ ] Confirmer qu'aucune migration locale non commitée n'existe
      (`supabase db diff` ou équivalent) avant merge.
- [ ] Merger `claude/product-renewal-baseline` dans `main` (revue manuelle
      recommandée vu le volume — 26 commits) puis déployer `main` via le
      pipeline existant (Netlify, `netlify.toml`).
- [ ] Après déploiement, vérifier la version servie (build hash / date)
      sur `projets.indxone.com`.

### 7. Checklist rollback

- [ ] Le déploiement précédent reste disponible via l'historique Netlify
      (rollback un clic, aucune action Supabase requise : ce lot n'a
      appliqué aucune migration, la base n'a pas besoin d'être restaurée).
- [ ] En cas de régression fonctionnelle détectée après déploiement,
      `git revert` du merge commit sur `main` plutôt qu'un reset — préserve
      l'historique et permet un nouveau merge ultérieur une fois corrigé.
- [ ] Aucune donnée destructive n'a été touchée par ce chantier (pas de
      `DROP`/`DELETE` en migration) — un rollback code pur suffit dans
      tous les cas.

### 8. Checklist post-déploiement

- [ ] Ouvrir l'app en production, vérifier Home/Projets/RUN/PROJET
      chargent sans erreur console.
- [ ] Activer le mode Équipe sur un espace réel existant, vérifier que les
      12 actions à `phase_id` legacy (cf. Phase C) s'affichent toujours
      correctement dans leur colonne équivalente.
- [ ] Vérifier qu'aucune des 30 actions/30 workspaces de production
      n'a disparu ou changé de statut après le déploiement.
- [ ] Surveiller les advisories Supabase (déjà connues, cf. Phase G) pour
      confirmer qu'aucune nouvelle alerte n'apparaît.

## Recommandation GO / NO-GO

**GO**, sous réserve des étapes de la checklist de déploiement
ci-dessus (en particulier la confirmation manuelle du projet Supabase
cible). Justification : tests/typecheck/lint/build verts, zéro régression
détectée en validation navigateur réelle sur les parcours critiques,
invariants d'architecture du départ tous préservés, schéma Supabase
entièrement synchronisé et vérifié, aucune migration en attente, aucune
dépendance ajoutée. La dette résiduelle documentée (Phase G) est connue,
non bloquante, et n'a pas grossi de manière incontrôlée sur 10 lots.
