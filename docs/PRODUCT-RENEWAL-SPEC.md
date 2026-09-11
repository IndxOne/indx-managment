# Product Renewal Spec — INDXONE Projets

Document de cadrage produit pour l'évolution vers un outil hybride
« Columns avec davantage de puissance ». Fait suite à `docs/AUDIT.md` et
`docs/PRODUCT-RENEWAL-BASELINE.md`. Aucune réécriture : ce document cadre une
évolution UI incrémentale sur l'architecture existante (domaine pur /
adaptateurs interchangeables / reducer partagé), qui reste inchangée sauf
mention explicite.

Convention de lecture : chaque écran est décrit avec — objectif, informations
visibles, actions principales, actions secondaires, comportement mobile,
comportement desktop, états vide/chargement/erreur, règles d'accessibilité.

---

## 1. Vision produit

INDXONE Projets doit rester l'outil qu'on ouvre sans réfléchir : aussi léger
et lisible que Columns.app, mais capable d'organiser du travail structuré
(phases, jalons, responsables) sans jamais imposer la complexité d'un ClickUp.
La promesse : **« Columns avec davantage de puissance »**, jamais
« ClickUp simplifié ». Toute capacité ajoutée doit rester invisible tant
qu'elle n'est pas nécessaire (progressive disclosure) et ne jamais dégrader
le temps entre « ouvrir l'app » et « voir ce qu'il y a à faire ».

## 2. Principes UX

1. Simplicité cognitive avant tout — une carte, un écran, une action à la fois.
2. Progressive disclosure : le détail (assigné, tags, sous-actions, jalons)
   vit dans le détail d'action ou des réglages, jamais sur la carte par défaut.
3. Pas de surcharge visuelle : une carte = 3 à 5 informations maximum.
4. Pas de duplication fonctionnelle : une seule implémentation de carte, une
   seule de segmented tabs, un seul moteur RUN/PROJET.
5. Pas de nouvelle dépendance lourde sans justification écrite dans le plan
   d'implémentation (voir §29 contraintes).
6. Empreinte de dépendances actuelle (`react`, `react-dom`,
   `@supabase/supabase-js`) préservée par défaut.
7. UI d'abord : si un écart avec la cible se résout en composant/écran, ne
   pas toucher `src/domain`, `app-reducer.ts`, ou le schéma Supabase.
8. Réutiliser `BottomSheet`, `ActionMenuSheet`, `useMoveWithUndo`,
   `StateBlocks`, `filter-actions.ts`, `calendar-engine.ts` plutôt que
   recréer un équivalent.

## 3. Personas prioritaires

- **Solo structuré** (profil actuel dominant, ex. l'utilisateur lui-même) :
  gère plusieurs espaces RUN (exploitation IT) et PROJET (missions), veut
  savoir en 3 secondes ce qui presse aujourd'hui, sans reporting.
- **Petite équipe naissante** (cible V1 collaboration) : 2 à 5 personnes sur
  un même projet, besoin minimal — savoir qui fait quoi, filtrer par
  responsable — sans permissions ni rôles.
- **Nouvel utilisateur sans tutoriel** : doit comprendre Espace → Projet →
  Actions en ouvrant l'app, sans documentation, par la structure elle-même.

## 4. Jobs-to-be-done

- « Quand j'ouvre l'app le matin, je veux voir ce que je dois faire
  aujourd'hui, sans naviguer. »
- « Quand je gère un projet à étapes, je veux voir où en est chaque étape
  d'un coup d'œil (vue Colonnes). »
- « Quand je suis débordé, je veux voir ce qui est en retard et ce qui est
  bloqué, sans avoir à filtrer manuellement. »
- « Quand une idée me vient, je veux la noter en 2 secondes sans choisir un
  projet tout de suite (Carnet). »
- « Quand je travaille à plusieurs, je veux voir qui est responsable de quoi,
  sans configurer de permissions. »

## 5. Navigation cible

Barre basse mobile à 4 destinations fixes :

- **Accueil** (remplace/fusionne l'actuel « Aujourd'hui ») — priorité action.
- **Projets** (remplace « Espaces ») — liste des espaces RUN + PROJET.
- **Cette semaine** — vue temporelle transversale (inchangée dans le fond).
- **Rappels** — relances actives (remonte au rang d'onglet fixe, sort de
  « Plus »).

Le contenu actuel de « Plus » (Carnet, Hub, Approches métier, Recherche,
Réglages) migre vers un point d'entrée secondaire (voir Lot 1 du plan
d'implémentation) — pas de 5ᵉ onglet, conforme au principe de simplicité.
Aucun changement de la mécanique route-as-state-machine : la cible ajoute/
renomme des valeurs de l'union `Route`, elle ne introduit pas de router.

## 6. Architecture informationnelle

```
Espace
 └── Projet
      ├── Sections / Phases        (où se situe le travail)
      │    └── Actions
      │         └── Sous-actions (1 niveau max, optionnel)
      ├── Vues                     (comment les données sont représentées)
      ├── Jalons                   (actions itemType=milestone, mises en avant)
      └── Activité                 (repoussé, voir §27)
```

Écart avec le modèle actuel : `Espace` = `Workspace` existant (inchangé).
`Projet` n'est **pas** une nouvelle entité — un `Workspace` de `kind:
"project"` **est** le Projet ; un `Workspace` de `kind: "run"` reste une
organisation temporelle sans phases. Pas de nouvelle table, pas de nouvelle
entité domaine : le mapping se fait entièrement dans l'UI (voir §22).

## 7. Modèle mental utilisateur

L'utilisateur doit percevoir trois axes indépendants et ne jamais les
confondre :

| Axe | Répond à | Champ actuel | Cible |
| --- | --- | --- | --- |
| **Phase** | Où se situe le travail | `Action.phaseId` | inchangé, terminologie « Phase »/« Étape » clarifiée en UI |
| **Statut** | Où en est l'action | `Action.status` | inchangé (`todo/doing/waiting/done` + `blocked` UI, voir §8) |
| **Vue** | Comment on regarde les données | état de composant, pas persistant | reste un état de composant (Colonnes/Liste/Semaine), jamais confondu avec Phase en libellé |

Le point de confusion actuel documenté par l'exploration (preset `simple` :
`phaseTemplate: ["a_traiter","en_cours","en_attente","termine"]` qui
duplique quasi les libellés de statut) est **la source n°1 de confusion à
corriger** dans ce renouveau : un preset ne doit plus proposer un
`phaseTemplate` qui mime les statuts.

## 8. Règles RUN vs PROJET

Les deux modes partagent strictement le même moteur (`app-reducer.ts`,
mêmes types `Action`/`Workspace`) — aucune bifurcation de domaine. Seule la
présentation change :

- **PROJET** : organisation principale par Phases/Étapes. Vues disponibles :
  Colonnes (une colonne par phase), Liste (regroupée par phase), Semaine
  (transversale intra-projet, inchangée dans le fond).
- **RUN** : organisation principale temporelle. Sections fixes : Aujourd'hui
  / Cette semaine / Plus tard / En attente. Pas de colonnes par phase (un RUN
  n'a typiquement pas de `phaseTemplate` pertinent), mais la vue Colonnes
  reste accessible en option pour les RUN qui définissent des phases
  (aucun blocage artificiel — principe déjà en place avec
  `isRecommendedApproach`, à conserver tel quel).

Le statut `blocked` (nouveau, voir §16 pour le mapping) est visible dans les
deux modes de la même façon (chip visuel identique).

## 9. Vue Colonnes

**Objectif** : voir en un coup d'œil où en est chaque phase d'un projet,
manipuler l'ordre par glisser-déposer, ajouter vite sans quitter la colonne.

**Informations visibles** : une colonne par phase (nom + compteur d'actions),
cartes compactes (voir §Carte, section 23) triées par ordre manuel/priorité.

**Actions principales** : glisser une carte vers une autre colonne (change la
phase, pas le statut) ; création inline en bas de colonne (champ texte,
Entrée = créer directement dans cette phase) ; clic sur une carte → détail.

**Actions secondaires** : réordonner les colonnes (si plusieurs phases),
masquer une colonne vide, filtre rapide (responsable/priorité/statut) au
niveau de la vue entière.

**Mobile** : la vue Colonnes devient un carrousel horizontal à une colonne
visible à la fois (swipe latéral pour changer de phase), chaque colonne
gardant le même contenu de carte qu'en desktop — pas de vue "par étapes"
séparée avec un rendu différent comme aujourd'hui (fusion, voir §22-24).

**Desktop** : colonnes côte à côte (reprend `KanbanBoard` existant comme
socle), drag & drop HTML5 natif conservé.

**États** : vide (« Aucune action dans cette phase », bouton création
inline) ; chargement (squelette de colonnes, réutilise `LoadingState`) ;
erreur (réutilise `ErrorState`, jusqu'ici jamais branché — première vraie
utilisation).

**Accessibilité** : chaque colonne est une région nommée (`aria-label`=nom de
phase), le déplacement drag & drop doit rester doublé d'une alternative non
gestuelle (menu « Déplacer » existant, déjà conforme), annonce vocale du
déplacement via `AnnouncerProvider` (déjà en place, à réutiliser).

## 10. Vue Liste

**Objectif** : lecture séquentielle dense, cas d'usage mobile principal et
RUN par défaut.

**Informations visibles** : sections (par phase en PROJET, par échéance
Aujourd'hui/Semaine/Plus tard/En attente en RUN), cartes compactes.

**Actions principales** : cycle statut 1-clic (checkbox existante,
conservée), swipe terminer/replanifier (conservé tel quel), clic → détail.

**Actions secondaires** : masquer les actions terminées (déjà présent dans
`ActionListSection`), filtres rapides.

**Mobile** : vue par défaut de RUN et alternative de PROJET (déjà le cas).

**Desktop** : reste disponible en option (ex. préférence de densité), mais la
Vue Colonnes est la vue par défaut de PROJET sur desktop.

**États** : identiques aux `StateBlocks` déjà en place (`EmptyState`,
`NoResultsState` si filtres actifs).

**Accessibilité** : inchangée — la checkbox `role="checkbox" aria-checked`
et les libellés `aria-label` existants sur `ActionCard` sont conservés tels
quels dans la carte unifiée (§23).

## 11. Vue Semaine

**Objectif** : planification à horizon 7 jours, transversale (tous espaces)
ou intra-projet.

**Informations visibles** : regroupement Aujourd'hui / Demain / Cette semaine
(labels `deriveScheduleKeys`/`formatRelativeLabel` existants, inchangés),
cartes compactes.

**Actions principales** : identiques à la Vue Liste (cycle statut, swipe,
clic → détail).

**Actions secondaires** : navigation directe vers l'espace d'origine
(`onOpenWorkspace`, déjà présent dans `ActionCard` en mode transversal).

**Mobile/Desktop** : rendu identique (déjà le cas aujourd'hui, aucune
branche `useIsDesktop`), à conserver — cible : fusionner les deux
implémentations actuelles (`AggregatedActionsScreen` et le mode « Par
semaine » de `ProjectWorkspaceScreen`) derrière une même fonction de
regroupement, sans dupliquer `deriveScheduleKeys` deux fois (dette actuelle,
voir §24 Éléments à fusionner).

**États** : identiques aux `StateBlocks`.

**Accessibilité** : inchangée.

## 12. Home

**Objectif** : remplacer/enrichir l'actuel écran « Aujourd'hui ». Répond à
quatre questions, dans cet ordre de priorité visuelle, sans aucun graphique
décoratif :

1. Que dois-je faire aujourd'hui ?
2. Que dois-je faire cette semaine ? (accès direct, pas le contenu complet)
3. Qu'est-ce qui est en retard ?
4. Qu'est-ce qui est bloqué ?

**Informations visibles** : liste d'actions Aujourd'hui (contenu actuel
d'`AggregatedActionsScreen title="Aujourd'hui"`, conservé), un bloc « En
retard » (actions dont l'échéance `day`/`week`/`month` est dépassée et
statut ≠ done — filtre nouveau côté UI, voir §26 pas de nouveau champ
domaine requis puisque calculable depuis `schedule` + `status` existants),
un bloc « Bloqué » (statut `blocked`, voir §16), un raccourci vers « Cette
semaine ».

**Actions principales** : mêmes interactions carte que la Vue Liste (cycle
statut, swipe, clic → détail), accès création rapide.

**Actions secondaires** : navigation vers Cette semaine / Rappels / Projets.

**Mobile** : écran d'accueil par défaut à l'ouverture de l'app (remplace
`spaces-list` comme route initiale — décision produit à trancher, voir §31).

**Desktop** : identique, disposition en blocs verticaux ou colonnes selon
largeur (pas de nouvelle librairie de grille — CSS existant).

**États** : vide encourageant (« Rien pour aujourd'hui » plutôt qu'un
tableau vide anxiogène), chargement (`LoadingState` déjà en place),
hors-ligne (`OfflineBanner`, inchangé).

**Accessibilité** : chaque bloc est une région `aria-label`ée distincte
(« Aujourd'hui », « En retard », « Bloqué ») pour permettre une navigation
par landmarks au lecteur d'écran.

## 13. Création rapide

**Objectif** : créer une action en un geste, depuis n'importe quel écran de
liste, sans friction.

**Comportement conservé** : `QuickAddBar` existante (saisie titre + Entrée)
reste le mécanisme principal — ne pas la remplacer par un FAB modal
générique qui ajouterait une étape. Le bouton « ... » ouvrant `AddActionSheet`
pour le formulaire complet (type, priorité, phase, récurrence) est conservé
à l'identique.

**Écart à combler** : `QuickAddBar` n'existe aujourd'hui que dans les écrans
d'espace (RUN/PROJET) et les vues transversales qui l'implémentent déjà —
elle doit être présente de façon cohérente sur Home et Cette semaine (déjà
le cas via `AggregatedActionsScreen`, à vérifier/harmoniser, pas de nouveau
composant).

**Mobile** : barre fixe en haut de liste (comportement actuel), pas de FAB
flottant à ajouter — conforme à l'absence actuelle et au principe de
simplicité (un mécanisme de création, pas deux).

**Desktop** : identique, éventuellement raccourci clavier `n` (voir §18,
repoussé).

**États** : validation immédiate (titre vide = pas de création, pas de
message d'erreur bloquant nécessaire au vu du existant).

**Accessibilité** : champ déjà `aria-label`é (à vérifier composant par
composant lors de l'implémentation), pas de changement de contrat.

## 14. Détail d'action

**Objectif** : nouvel écran (aujourd'hui inexistant — toute édition se fait
via des sheets superposées sans écran dédié) qui rassemble ce qui est
aujourd'hui éclaté entre `EditActionSheet`, `MoveActionSheet`, `NotesSheet`,
`LinkActionSheet`, `ActionMenuSheet`.

**Décision de cadrage** : le détail reste une **sheet plein écran** (pas une
nouvelle route poussée dans `Route`, pour ne pas introduire de navigation à
url/historique) — cohérent avec l'absence de router actuelle et le principe
« pas de nouvelle dépendance ». Alternative validée dans le plan
d'implémentation si l'exploration confirme un besoin de deep-link (peu
probable pour une PWA sans partage de lien).

**Informations visibles** : titre, description, statut, priorité, phase,
échéance, responsable(s) si `collaborationMode==="team"`, tags, sous-actions
(si le projet en a, voir §15... non, voir sous-tâches ci-dessous), notes
horodatées, action liée, historique des relances si `waiting`.

**Actions principales** : éditer chaque champ inline (remplace le formulaire
séparé `EditActionSheet` pour le contenu ; `MoveActionSheet` reste pour le
changement d'axe planification/phase/statut si jugé plus clair en flux
dédié — décision produit ouverte, voir §31), ajouter une note, lier une
action, ajouter une sous-action (1 niveau max, cf. contrainte du brief).

**Actions secondaires** : dupliquer, supprimer (reprend `useDeleteWithUndo`
existant), partager (fonction `share-action.ts` déjà existante).

**Mobile** : sheet plein écran (`BottomSheet` élargie ou nouveau variant
plein-écran du même composant — réutilisation du socle, pas une nouvelle
primitive).

**Desktop** : peut s'afficher en panneau latéral plutôt que plein écran
(optionnel, à trancher en implémentation — n'affecte pas le domaine).

**États** : chargement (rare, l'action est déjà en mémoire côté client),
erreur de sauvegarde (reprendre le pattern `syncStatus` existant :
`pending`/`conflict`).

**Accessibilité** : reprend le contrat `BottomSheet` (focus trap, Échap,
restauration focus) — déjà conforme, à ne pas régresser.

## 15. Collaboration V1

Cadrage strict du brief : `collaborationMode` et `assigneeIds` sont exposés
a minima, sans RBAC/chat/organisation :

- Un projet est **Solo** ou **Équipe** (`collaborationMode`), réglable dans
  `ApproachSettingsScreen` (écran déjà existant, un champ à y ajouter).
- **Assignation simple** : un ou plusieurs responsables par action
  (`assigneeIds` déjà `string[]`), choisis dans une liste plate sans notion
  de rôle. Pas d'invitation, pas de gestion de membres avancée dans ce lot —
  la source de la liste de responsables possibles est une décision produit
  ouverte (voir §31 : identifiants locaux vs table `projets_members` future).
- **Affichage discret** : avatar/initiale en chip sur la carte, uniquement
  si `collaborationMode==="team"` et `assigneeIds.length > 0` — jamais affiché
  sur un projet Solo (progressive disclosure, principe n°2).
- **Filtre par responsable** : nouvelle entrée dans `ActionFilters` (ajout
  d'un `Set<string>` d'assigneeIds), cohérente avec le pattern existant de
  `filter-actions.ts` — extension additive, pas de refonte.

Explicitement hors scope : permissions par rôle, historique d'activité par
utilisateur, notifications de mention, chat, gestion d'organisation/équipe
en tant qu'entité séparée.

## 16. Mobile

Contraintes déjà respectées à préserver telles quelles : cibles tactiles
≥44px, safe-areas iOS/Android (`env(safe-area-inset-*)`), swipe
terminer/replanifier toujours doublé d'un équivalent non gestuel,
`prefers-reduced-motion` respecté, clavier virtuel géré par `BottomSheet`
(`visualViewport`).

Navigation basse simple à 4 entrées (§5), accès rapide à la création via
`QuickAddBar` en haut de chaque liste (pas de FAB, §13). Vue Colonnes en
carrousel à une colonne (§9). Nouveau statut `blocked` visible en chip
identique aux autres statuts, pas de traitement visuel spécial disproportionné.

## 17. Desktop

Sidebar existante (`BottomNav` variant desktop) conservée, mise à jour pour
refléter la nouvelle navigation à 4 entrées + accès secondaire (Carnet, Hub,
Approches, Recherche, Réglages) — remplace l'ordre actuel en dur
(Espaces/Aujourd'hui/Semaine/Rappels/Approches métier/Plus) par une
structure cohérente avec §5. Vue Colonnes pleine largeur (`KanbanBoard`
existant comme socle). Détail d'action optionnellement en panneau latéral
plutôt que plein écran (§14).

## 18. Raccourcis éventuels

Aucun raccourci clavier n'existe aujourd'hui (confirmé par l'exploration :
seul `Escape` sur les sheets, comportement standard de dialog). Proposition
pour un lot **futur, hors périmètre de ce chantier** (à documenter comme
repoussé, §27) : `n` nouvelle action, `/` recherche, `Échap` déjà présent.
Ne pas implémenter dans les lots 1-10 du plan — pas de justification
suffisante face au principe « pas de complexité non demandée ».

## 19. Empty states

Réutiliser `EmptyState` existant partout (icône + titre + description +
action optionnelle) — déjà cohérent visuellement. Nouveaux emplacements
nécessaires : Home sans actions du jour (message encourageant, pas
anxiogène), colonne de phase vide (§9), filtre responsable sans résultat
(reprend `NoResultsState` existant, message générique déjà suffisant).

## 20. Loading / erreurs / offline

- **Loading** : `LoadingState` (squelette) déjà en place globalement à
  `App.tsx`. Écart identifié par l'exploration : aucun écran n'a de
  chargement local propre — à évaluer au cas par cas dans le plan
  d'implémentation, sans complexifier si le chargement global suffit déjà
  (l'optimisme du reducer masque la plupart des cas, cf. AUDIT.md).
- **Erreurs** : `ErrorState` existe mais n'est **jamais branché** — premier
  vrai cas d'usage attendu dans ce chantier serait la Vue Colonnes en cas
  d'échec de chargement réseau (rare avec Supabase + optimisme, mais le
  composant doit enfin servir plutôt que rester mort).
- **Offline** : `OfflineBanner` + file de retry existante (Lot 3 antérieur)
  conservées à l'identique — hors périmètre de ce chantier UI.

## 21. Accessibilité

Aucune régression tolérée sur l'existant (voir §16 pour le détail des
mécanismes déjà en place : `AnnouncerProvider`, `aria-live`, focus trap
`BottomSheet`, `prefers-reduced-motion`, safe-areas, cibles tactiles ≥44px).
Exigences nouvelles pour les écrans/composants créés dans ce chantier :

- Vue Colonnes : régions nommées par phase, alternative non gestuelle au
  drag & drop (déjà garantie par le menu « Déplacer » existant).
- Carte unifiée (§23) : conserver le contrat `role="checkbox"
  aria-checked`/`aria-label` de l'actuel `ActionCard` — c'est la référence,
  pas `KanbanCard` qui n'a pas de checkbox accessible aujourd'hui (écart à
  corriger par la fusion, pas à reproduire).
- Détail d'action : hérite du contrat `BottomSheet` sans dérogation.
- Filtre responsable : liste de cases à cocher standard, pas de composant
  personnalisé sans label.

## 22. Mapping actuel → cible

| Concept actuel | Concept cible | Changement de code |
| --- | --- | --- |
| `Workspace{kind:"project"}` | Projet | aucun (renommage UI seul) |
| `Workspace{kind:"run"}` | Espace RUN | aucun |
| Route `today` | Home (enrichi retard/bloqué) | UI seule, ajout de sélecteurs dérivés |
| Route `spaces-list` | Projets | renommage libellé + route |
| Route `week` | Cette semaine | inchangé |
| Route `reminders` (dans "Plus") | Rappels (onglet fixe) | déplacement dans `routeToTab`/`BottomNav` |
| `ActionCard` + `KanbanCard` | Carte unifiée `variant="list"\|"kanban"` | fusion composant (Lot 2) |
| Kanban desktop + liste mobile « par étapes » | Vue Colonnes (carrousel mobile / grille desktop) | nouveau composant partagé (Lot 3) |
| `phaseTemplate` façon statut (preset `simple`) | `phaseTemplate` distinct des statuts | ajustement des presets (données, pas de schéma) |
| Statuts `todo/doing/waiting/done` | + statut `blocked` visuel | voir décision ouverte §31 (nouvelle valeur d'union `ActionStatus` = changement de type, à trancher) |
| `assigneeIds`/`collaborationMode` non exposés | Exposés a minima (§15) | UI + extension `ActionFilters` |
| « Plus » (fourre-tout) | Menu secondaire structuré | réorganisation, pas de nouvel écran métier |

## 23. Composants à réutiliser

`BottomSheet`, `ActionMenuSheet`, `useMoveWithUndo`/`useDeleteWithUndo`,
`StateBlocks` (tous), `filter-actions.ts`, `quick-filters.ts`,
`calendar-engine.ts`, `recurrence-engine.ts`, `waiting-reminder.ts`,
`QuickAddBar`, `UndoBanner`, `AnnouncerProvider`, `PRESET_REGISTRY` (comme
point d'extension), `KanbanBoard` (comme socle de la Vue Colonnes desktop),
`ActionListSection` (comme socle de la Vue Liste), `WorkspaceCard`.

## 24. Composants à fusionner

1. **`ActionCard` + `KanbanCard`** → un composant unique avec prop
   `variant: "list" | "kanban"`, en gardant le contrat d'accessibilité
   d'`ActionCard` comme référence (checkbox statut). Priorité la plus haute
   (déjà identifié dans l'AUDIT, condition de la Carte unifiée §23 du
   présent document, ligne « Carte »).
2. **Segmented tabs dupliquées** (`RunWorkspaceScreen`,
   `ProjectWorkspaceScreen`) → composant `SegmentedTabs` partagé.
3. **Logique de regroupement Semaine dupliquée** (`AggregatedActionsScreen`
   vs mode « Par semaine » de `ProjectWorkspaceScreen`) → une seule fonction
   de regroupement partagée, consommée par les deux écrans.
4. **4 écrans transversaux quasi identiques** (`RemindersScreen`,
   `SearchScreen`, `ActionsByStatusScreen`, `AggregatedActionsScreen`) →
   factoriser le bloc commun (résolution preset, sheets Move/Edit/Notes/Link,
   undo) derrière un hook ou composant partagé, chaque écran ne gardant que
   sa logique de sélection d'actions propre.
5. **Vue mobile « par étapes » de `ProjectWorkspaceScreen`** → absorbée par
   la Vue Colonnes en mode carrousel (§9), plus de 3ᵉ implémentation
   distincte du concept phase.

## 25. Composants à créer

- **Carte unifiée** (résultat de la fusion §24.1, listé ici comme livrable).
- **`ColumnsView`** : conteneur de la Vue Colonnes, wrapper responsive
  (grille desktop / carrousel mobile) autour de la logique déjà présente
  dans `KanbanBoard`.
- **`ActionDetailSheet`** : nouvel écran de détail d'action (§14), composé
  à partir des sheets existantes plutôt que recréées de zéro (réutilise
  leurs sous-formulaires internes).
- **`AssigneeChip`/`AssigneePicker`** : affichage discret + sélection simple
  de responsable (§15), petits composants, pas de nouvelle dépendance.
- **`HomeOverdueBlock`/`HomeBlockedBlock`** : sélecteurs dérivés + petits
  blocs d'affichage pour Home (§12) — logique pure ajoutable à
  `filter-actions.ts` ou nouveau module `src/app/utils/home-sections.ts`,
  aucune dépendance nouvelle.
- **`SecondaryMenu`** (remplaçant du contenu de « Plus ») : simple liste de
  navigation, pas de nouveau pattern.

## 26. Fonctions à masquer

- Champs avancés des approches métier peu utilisées (`sprint`,
  `backlogRank`, `debtFlag`, `workload`) : restent dans le modèle de preset
  mais ne s'affichent que si l'approche correspondante est active
  (déjà le comportement actuel via `visibleFields` — à vérifier qu'aucune
  régression n'apparaît avec la carte unifiée).
- Détail complet d'une action (description longue, historique de relances,
  toutes les notes) : masqué derrière le clic « détail », jamais sur la
  carte (principe n°2, déjà largement respecté par l'existant).
- Filtre par responsable : masqué si `collaborationMode==="solo"` (pas de
  case à cocher inutile pour un projet solo).

## 27. Fonctions à repousser

- Raccourcis clavier (§18).
- Permissions/RBAC, chat, gestion d'organisation (§15, hors scope V1).
- Activité/Activity log en tant que concept exposé (n'existe pas
  aujourd'hui, aucune preuve de besoin fort exprimé dans le brief au-delà
  de la mention en architecture conceptuelle — à instrumenter plus tard si
  la collaboration V1 révèle un besoin réel).
- Custom Fields avancés (le brief limite explicitement aux 4 champs V1 :
  priorité, responsable, date, tags).
- Statuts personnalisables (le brief les envisage « éventuellement plus
  tard », pas dans ce chantier).
- Sous-actions au-delà d'un niveau (contrainte explicite du brief).
- Réconciliation multi-device au-delà d'une édition hors-ligne consécutive
  (déjà documenté comme dette produit non résolue dans l'AUDIT, non
  aggravée ni résolue par ce chantier UI).
- Pièces jointes : n'existent pas aujourd'hui: le brief dit « si déjà
  supportées ou prévues » — ce n'est pas le cas, donc **non construites**
  dans ce chantier (pas de nouvelle capacité de stockage de fichiers).

## 28. Risques

- **Statut `blocked` = changement de type domaine.** Ajouter une valeur à
  l'union `ActionStatus` touche `src/domain/types.ts`, `move-action.ts`,
  tous les libellés, et potentiellement les données existantes en base (pas
  de migration de schéma nécessaire car `status` est déjà `text`, mais
  décision produit à trancher avant tout code — voir §31 et principe n°7
  « ne pas toucher au domaine si l'UI suffit » : une alternative sans
  toucher au type est un badge dérivé d'un champ existant (ex.
  `waitingSince` dépassé) plutôt qu'un vrai statut ; à arbitrer.
- **Fusion `ActionCard`/`KanbanCard` en présence de tests nombreux** (21
  tests sur `ActionCard.test.tsx` seul) : risque de régression si le
  `variant` change un comportement testé — stratégie de migration écran par
  écran obligatoire (voir plan d'implémentation Lot 2).
- **Vue Colonnes en carrousel mobile** : nouveau pattern d'interaction
  (swipe entre colonnes) qui peut entrer en conflit avec le swipe existant
  sur les cartes (terminer/replanifier) — zones de geste à border
  soigneusement en implémentation.
- **Filtre responsable sans source de vérité des membres** : `assigneeIds`
  est une liste de chaînes libres aujourd'hui (initialisée à `[]`), sans
  table `projets_members` — le picker de responsable devra soit inventer un
  identifiant local, soit ce chantier doit d'abord trancher cette décision
  produit (§31) avant l'implémentation du Lot 8.
- **Renommage de routes/libellés** (Espaces→Projets, Aujourd'hui→Home) :
  risque de rupture pour les préférences utilisateur déjà stockées
  (`secondTab` dans `AppSettingsScreen`) si les valeurs de route changent de
  nom sans migration de la préférence stockée localement.
- **CSS monolithique (1967 lignes) sans scoping** : tout nouveau composant
  ajoute un risque de collision de classe déjà documenté dans l'AUDIT — à
  nommer avec un préfixe dédié par nouveau composant (`columns-view-*`,
  `action-detail-*`) plutôt que réutiliser des noms génériques.

## 29. Plan de migration incrémental

Voir `docs/PRODUCT-RENEWAL-IMPLEMENTATION-PLAN.md` pour le détail lot par
lot. Résumé de la logique de séquencement : (1) fondations de navigation qui
ne changent aucun comportement métier, (2) fusion de la carte (base de tout
le reste), (3) Vue Colonnes canonique, (4/5) interactions de création et de
détail, (6/7) harmonisation RUN/PROJET et Semaine/Home, (8) collaboration
légère (dépend de la carte unifiée et des filtres), (9) polish/accessibilité
transverse, (10) nettoyage du code désormais mort (anciens `ActionCard`/
`KanbanCard` séparés, anciennes vues « par étapes »).

## 30. Critères d'acceptation

Pour l'ensemble du chantier (déclinés par lot dans le plan
d'implémentation) :

- Zéro régression fonctionnelle : toutes les capacités listées en
  « Capacités actuelles à préserver » du brief restent opérantes et testées.
- 257 tests existants (ou leur équivalent après renommage de fichiers)
  restent verts à chaque lot, plus les nouveaux tests des composants créés.
- `npm run typecheck && npm run lint && npm test -- --run && npm run build`
  verts avant tout merge de lot.
- Aucune nouvelle dépendance de production ajoutée sans section « Risques »
  dédiée dans le plan d'implémentation justifiant l'exception.
- Aucune modification du schéma Supabase sauf si un lot le justifie
  explicitement (ex. table de membres pour la collaboration, si la décision
  §31 en confirme la nécessité) — et dans ce cas, nouvelle migration
  versionnée dans `supabase/migrations/`, jamais de modification manuelle.
- Domaine (`src/domain`, `app-reducer.ts`) inchangé sauf décision explicite
  documentée (ex. statut `blocked`), conformément au principe n°7.
- Chaque écran cible respecte son gabarit de description (objectif / infos
  visibles / actions principales / secondaires / mobile / desktop / états /
  accessibilité) tel que rempli dans ce document.

## 31. Décisions produit encore nécessaires

(Reprises et développées dans le plan d'implémentation en tant que
préalables à certains lots — voir aussi la liste de livrable final.)

1. Le statut `blocked` est-il un vrai statut (extension de l'union
   `ActionStatus`, § domaine) ou un badge dérivé sans toucher au domaine ?
2. La route initiale au démarrage devient-elle Home (nouveau) ou reste-t-elle
   la liste des Projets ?
3. Le détail d'action est-il une sheet plein écran (mobile et desktop) ou un
   panneau latéral sur desktop ?
4. La source des responsables assignables (`assigneeIds`) : identifiants
   locaux libres (texte libre par utilisateur) ou nouvelle table Supabase
   `projets_members` (implique une migration de schéma) ?
5. Le renommage de libellés (Espaces→Projets, Aujourd'hui→Home, Plus→menu
   secondaire) s'accompagne-t-il d'une migration de la préférence
   `secondTab` stockée localement, ou celle-ci est-elle réinitialisée ?
6. Le `phaseTemplate` du preset `simple` (qui duplique les statuts) est-il
   corrigé par une nouvelle donnée de preset (`cadrage/exécution/suivi` par
   exemple) ou le preset `simple` est-il retiré au profit d'un preset RUN/
   PROJET générique sans phases nommées façon statut ?
