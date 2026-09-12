# Lot 9 — Audit transversal polish/cohérence/accessibilité

Passe de finition uniquement — aucune capacité métier, aucun modèle,
aucune migration ajoutés.

## Méthode

Audit par lecture ciblée (composants partagés, `global.css`, écrans
principaux) + recherche de motifs (`grep`) plutôt que relecture exhaustive
fichier par fichier, pour rester dans le temps imparti à une passe de
polish. Validation navigateur réelle (Chromium headless, Playwright
Python installé en session, `package.json` inchangé — même stratégie que
Lot 8.1) sur desktop (1280×900) et mobile (375×812).

## P0 — accessibilité / régression (corrigés)

1. **Cascade CSS qui annulait `.tap-target`** (`.sidebar-workspace-item`,
   `.sidebar-workspace-create`) : ces deux boutons portent la classe
   `tap-target` (44px voulu) mais une règle plus tardive dans
   `global.css`, à spécificité égale, fixait `min-height: 36px` et
   l'emportait — la cible tactile réelle était donc 36px malgré
   l'intention affichée dans le JSX. **Corrigé** : `min-height:
   var(--touch-target)`.
2. **`.icon-btn` (menu "…") et `.quick-add-plus` sous 44px** (32px et
   40px). Ce sont de vrais boutons cliquables (menu contextuel de carte,
   validation d'ajout rapide), pas des éléments décoratifs. **Corrigé**
   sans changement visuel : zone cliquable étendue à 44px via un
   pseudo-élément `::before` positionné en `inset` négatif, le cercle
   visuel restant à sa taille d'origine (densité des rangées inchangée).

## P1 — incohérence visible (corrigée)

3. **`WorkspaceNotFound` (App.tsx) dupliquait le pattern `ErrorState`**
   (même `.state-block role="alert"`, bouton avec libellé différent).
   **Corrigé** : `ErrorState` accepte désormais un `retryLabel` optionnel
   (défaut inchangé : "Réessayer") et `WorkspaceNotFound` le réutilise —
   une seule implémentation du bloc d'erreur dans toute l'app.

## P2 — polish (corrigé)

4. **Toggle "Masquer/Afficher terminées" sans état ARIA de bascule** —
   le libellé change déjà dynamiquement (accessible), mais `aria-pressed`
   manquait pour exposer explicitement l'état on/off à un lecteur
   d'écran. **Ajouté** : `aria-pressed={hideDone}`.

## Points audités et jugés déjà conformes (aucun changement)

- **Focus** : anneau `:focus-visible` global déjà défini une seule fois
  (`--focus-ring`), cohérent partout.
- **Sheets/dialogs** : `role="dialog"` + `aria-modal`, fermeture Escape,
  clic sur backdrop, restauration du focus précédent — déjà implémentés
  dans `BottomSheet` et réutilisés par tous les sheets (Membres,
  Assignation, Filtres, ActionDetail…).
- **`prefers-reduced-motion`** : chacune des 7 animations/keyframes du
  fichier a sa contrepartie `animation: none` sous la media query —
  couverture complète, aucun trou trouvé.
- **Alternative au swipe/DnD** : le menu "…" de chaque carte (`Terminer`,
  `Déplacer`, etc.) offre déjà l'équivalent clavier/clic du swipe mobile
  et du drag-and-drop desktop — non dupliqué, déjà en place depuis les
  lots précédents.
- **`aria-current`** : déjà posé correctement sur les items de navigation
  (bottom nav, sidebar desktop) et les onglets `SegmentedTabs`/`FilterSheet`
  radiogroups avec `aria-selected`/`role="radio"` natif.
- **Colonnes qui débordent à 1280px** (4 colonnes, la dernière tronquée à
  l'écran) : comportement **intentionnel et documenté** dans
  `ColumnsView.tsx` (scroll horizontal natif desktop/mobile, cf.
  commentaire d'en-tête du composant) — pas un défaut, aucune correction.
- **États** (`StateBlocks.tsx`) : `EmptyState`, `LoadingState`,
  `ErrorState`, `NoResultsState`, `OfflineBanner` déjà tous présents et
  correctement réutilisés à travers l'app ; les deux bannières
  spécifiques de `supabase-store.tsx` (conflit de sync, erreur réseau)
  réutilisent la classe `.offline-banner` mais ont des actions propres
  (garder ma version / garder celle du serveur, fermer) : ce n'est pas
  une duplication de composant, seulement un réemploi correct du token
  visuel pour un besoin différent — aucun changement.
- **Micro-copy** ("Phase" vs "Par étapes") : distinction volontaire entre
  le **nom du champ** d'une action (Phase, dans ActionDetail/Move/Add) et
  le **nom du mode d'organisation** de la vue Colonnes ("Par étapes",
  dans les onglets/cartes d'espace) — deux concepts différents, pas des
  synonymes accidentels. Aucune fusion tentée : le brief interdit de
  renommer les valeurs internes et la distinction sert la clarté, pas le
  hasard.
- **Terminologie collaboration** ("membre"/"responsable"/"équipe", jamais
  "compte"/"utilisateur"/"rôle"/"permission") : déjà strictement respectée
  depuis le Lot 8B, revérifiée par grep — aucune régression.

## Reporté au Lot 10 (hors scope Lot 9, nécessiterait plus qu'un polish)

- Audit de contraste **outillé** (calcul automatisé WCAG) des paires
  chip bg/texte — les paires actuelles suivent des tons Apple HIG déjà
  choisis avec soin, mais aucun outil de mesure n'a été exécuté ici.
- Refactor local d'`ActionDetailSheet` (11+ props) : à la lecture, la
  prop `collaboration` groupée (Lot 8B) a déjà réduit la pression ; le
  reste des props correspond à des axes indépendants documentés (axe par
  axe, cadrage §6) et ne nuit pas à la lisibilité au point de justifier
  un refactor avec le risque de régression que cela implique sans gain
  net démontré — laissé tel quel par prudence.
- Tests de non-régression visuelle automatisés (captures de référence) —
  la validation de ce lot s'est appuyée sur une session Playwright
  manuelle, pas sur une suite de screenshots versionnée.

## Design tokens (Phase B)

Un seul écart réel trouvé et corrigé : les deux `min-height: 36px`
dupliqués remplacés par le token existant `--touch-target` (cf. P0 #1).
Le reste des valeurs "arbitraires" relevées (32px/40px/46px/48px/52px/
56px/60px) correspond à des tailles décoratives ou de composants
distincts intentionnellement différents (icônes d'illustration, hauteur
de barre de recherche, avatar d'espace…) — aucune duplication supplémentaire
trouvée qui vaille la peine d'être factorisée sans risque.

## Fichiers modifiés

- `src/app/styles/global.css` — tokens tap-target + hit-area `.icon-btn`/`.quick-add-plus`
- `src/app/App.tsx` — `WorkspaceNotFound` → `ErrorState`
- `src/app/components/StateBlocks.tsx` — `ErrorState.retryLabel`
- `src/app/components/StateBlocks.test.tsx` — test du nouveau prop
- `src/app/components/ActionListSection.tsx` — `aria-pressed`
- `src/app/components/ActionListSection.test.tsx` — assertions `aria-pressed`

## Tests / build

412/412 tests (1 nouveau : `ErrorState` avec `retryLabel`), typecheck,
lint et build : tous verts.

## Validation navigateur (Chromium headless, desktop 1280×900 + mobile 375×812)

Parcours complet sans erreur console : Home → Projets → créer espace
PROJET (Solo) → Columns → ActionDetail (pas de rangée Responsable en
Solo) → Semaine → Réglages → Équipe → ajout membre → ActionDetail
(rangée Responsable + assignation) → filtre Responsable PROJET →
création espace RUN → Rappels → retour Accueil. Captures locales dans
`/tmp/lot9-*.png` (non versionnées).
