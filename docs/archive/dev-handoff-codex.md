# Support dev — INDXONE Projets

Document d'onboarding pour toute contribution (Codex inclus) : architecture,
conventions, et backlog priorisé. Complète `docs/mobile-product-audit.md`
(diagnostic UX détaillé) et `docs/reference-prototype-v0.md` (suivi des
reprises depuis le prototype) — ne pas dupliquer leur contenu, y renvoyer.

## Stack et architecture

- React 18 + TypeScript strict, Vite 5.4, Vitest + Testing Library, ESLint
  flat config. PWA (service worker `registerType:"prompt"`).
- Domaine pur dans `src/domain/` (types, `workspace.ts`, reducers) — aucune
  dépendance UI ni Supabase. Toute règle métier nouvelle s'y écrit d'abord,
  testée isolément.
- Persistance via deux adaptateurs interchangeables sous `src/app/adapters/` :
  `SupabaseStoreProvider` (réel) et `TemporaryStoreProvider` (mémoire, utilisé
  par tous les tests d'écran). Les deux exposent la même interface
  `StoreContextValue` (`store-context.ts`) et partagent le même reducer pur
  `app-reducer.ts` — un nouvel événement métier se déclare une seule fois là,
  puis chaque adaptateur l'écrit dans son "backend" (mémoire ou Supabase).
- Isolation multi-utilisateur par header `x-user-hash` (pas de Supabase
  Auth). Toute nouvelle table `projets_*` reprend la policy RLS existante :
  `user_hash = (current_setting('request.headers', true)::json ->> 'x-user-hash')`.
- Écritures concurrentes sur une même ressource : passer par
  `queuePersist(key, persist)` (sérialise les writes, propage l'erreur en
  Promise) plutôt que par un `dispatch` fire-and-forget — évite les races
  déjà corrigées deux fois dans l'historique du projet.
- Préréglages métier (`src/presets/preset-registry.ts`) : chaque
  `ProfessionalApproach` déclare ses champs visibles, filtres rapides et
  éventuellement un `phaseTemplate`. Ajouter une approche ne touche aucune
  contrainte base (colonne `approach` = texte libre, pas d'enum SQL).

## Conventions de contribution

- Une branche dédiée par sujet, jamais de commit direct sur `main`.
- Avant toute PR : `npm run typecheck && npm run lint && npm test -- --run && npm run build`
  doivent passer. Le nombre de tests ne doit jamais régresser.
- Pas de sur-ingénierie : une fonctionnalité minimale, pas d'abstraction
  anticipée, pas de commentaire décrivant le "quoi" (les noms suffisent) —
  seulement le "pourquoi" quand une contrainte n'est pas évidente.
- Mobile-first obligatoire : toute nouvelle vue se valide d'abord à 390×844
  (iPhone standard), cibles tactiles ≥ 44px, respect de
  `env(safe-area-inset-*)` (actif depuis `viewport-fit=cover`, PR #33).
- Accessibilité : `aria-current`/`aria-selected` sur les états actifs,
  jamais d'information portée uniquement par la couleur,
  `prefers-reduced-motion` respecté sur toute animation.

## Backlog priorisé pour les devs

### Lot 1 — Fiabilité et confort mobile immédiat
Détail complet : `docs/mobile-product-audit.md` (section "Lot 1").

1. Garder le bouton de validation des sheets visible au-dessus du clavier
   virtuel ; scroller le premier champ invalide dans la zone visible.
2. Remplacer les états de chargement par un skeleton à hauteur stable
   (éviter le layout shift), garder la nav bottom interactive pendant le
   chargement.
3. Instrumentation minimale sans donnée métier : destination ouverte,
   capture rapide vs. avancée, succès/échec, temps jusqu'à la 1ère action.

### Lot 2 — Exécution à une main

1. Swipe court sur les cartes d'action (terminer à droite, replanifier à
   gauche), avec seuil, aperçu et annulation — toujours doublé d'un
   équivalent non-gestuel accessible.
2. Bouton d'ajout contextuel accessible depuis Aujourd'hui/Semaine (pas
   seulement depuis un espace), avec dernier espace utilisé mémorisé.
3. Préférence de densité de carte (compacte/confortable), mémorisée par
   espace.

### Lot 3 — Offline utile

1. File locale des mutations en attente + résolution de conflit explicite
   (jamais d'écrasement silencieux d'une version distante).
2. Badge de synchronisation par action (synced / en attente / conflit).
3. Personnalisation d'une destination de la barre basse (ex. remplacer
   "Semaine" par "Rappels").

### UI/UX transverse — état actuel vs. à faire

| Fait | À faire |
| --- | --- |
| Dark mode, recherche, sheets centrées avec fond flouté | Skeleton loaders à hauteur stable |
| Template "Site web / E-commerce" à la création d'espace (PR #34) | Swipe actions sur les cartes |
| Safe-area iOS/Android (PR #33) | Badge de sync par action |
| Objectifs Hub déclaratifs (objectif mensuel/TJM/trésorerie) | File offline + réconciliation |

### Ce qui est explicitement hors scope (ne pas réintroduire)

- Toute persistance `localStorage` comme source de vérité — Supabase
  uniquement (cf. `docs/reference-prototype-v0.md`, section "Non pertinent").
- Calcul automatique des objectifs Hub à partir des actions — champs
  déclaratifs saisis à la main uniquement, aucune notion d'action
  "facturée" n'existe dans le modèle.
- Blocage d'une combinaison nature/approche : les préréglages ne servent
  qu'à un avertissement discret, jamais à interdire un choix.

## Avant de livrer une PR

1. Tests + build verts (voir conventions ci-dessus).
2. Vérifier qu'aucune régression visuelle mobile (390×844) n'est introduite.
3. PR avec motivation, description des fichiers touchés, résultat des
   commandes de validation.
