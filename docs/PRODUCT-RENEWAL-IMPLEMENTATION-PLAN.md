# Product Renewal Implementation Plan — INDXONE Projets

Découpage en 10 lots indépendants, ordonnés pour minimiser le risque et
garantir un état vert (build + tests) à chaque étape. Découle de
`docs/PRODUCT-RENEWAL-SPEC.md`. Zéro big-bang, zéro rewrite : chaque lot est
mergeable seul et n'exige pas que les lots suivants soient commencés.

Contraintes transverses à tous les lots :
- `npm run typecheck && npm run lint && npm test -- --run && npm run build`
  verts avant tout merge.
- Aucune suppression de comportement existant sans décision explicite notée
  dans le lot concerné.
- Aucune modification du schéma Supabase sauf nécessité produit actée
  (seul le Lot 8 peut potentiellement en avoir besoin, sous condition).
- Aucune nouvelle dépendance de production sans section « Justification »
  explicite dans le lot — aucun lot ci-dessous n'en requiert une à ce stade.

---

## Lot 1 — Navigation + shell

**Objectif** : faire évoluer `App.tsx`/`BottomNav` vers la navigation cible
(Accueil, Projets, Cette semaine, Rappels + menu secondaire) sans changer un
seul écran de contenu.

**Fichiers concernés** :
- `src/app/App.tsx` (union `Route`, `routeToTab`, libellés de route)
- `src/app/components/BottomNav.tsx` (TABS, ordre sidebar desktop)
- `src/app/screens/MoreScreen.tsx` → renommé/adapté en menu secondaire
- `src/app/hooks/useSecondTabPreference.ts` (impact potentiel, voir risques)

**Dépendances** : aucune — c'est le lot fondateur.

**Risques** :
- Renommage de route (`spaces-list`→conceptuellement « Projets »,
  `today`→conceptuellement « Home ») : si les valeurs internes de l'union
  `Route` changent de nom littéral, toute préférence stockée en
  `localStorage` référençant une ancienne valeur casse silencieusement.
  Mitigation : garder les valeurs internes de route inchangées (`"today"`,
  `"spaces-list"`) et ne renommer que les **libellés affichés** dans ce lot ;
  reporter tout renommage de valeur de route à un lot ultérieur avec
  migration de préférence explicite (décision produit §31.5 de la spec).
- Rappels remonte au rang d'onglet fixe : `secondTab` (personnalisation
  actuelle qui substitue Semaine par Rappels) devient redondant. Décision :
  conserver `secondTab` tel quel dans ce lot (n'affecte que le 2ᵉ onglet
  mobile), le réévaluer seulement si Rappels devient un onglet permanent —
  dans ce cas, un lot dédié désactivera/nettoiera `useSecondTabPreference`
  avec une décision explicite (pas dans ce lot).

**Stratégie de migration** : renommage des libellés visibles uniquement
d'abord (chaîne de caractères affichées), sans toucher à l'union `Route` ni
à la logique de `routeToTab`. Un commit séparé pour l'éventuel ajout de
Rappels comme 4ᵉ onglet fixe mobile (remplaçant Espaces/Semaine dans
`TABS`), avec test de non-régression sur `BottomNav.test.tsx`.

**Tests nécessaires** : `BottomNav.test.tsx` (nouveaux libellés, nouvel
onglet), `App.test.tsx` (parcours de navigation mis à jour).

**Critères de sortie** : les 4 destinations cibles sont accessibles depuis
la barre basse mobile et la sidebar desktop ; aucun écran de contenu n'a
changé ; tests verts.

**Rollback** : revert du commit unique de ce lot (aucune dépendance externe
créée).

---

## Lot 2 — ActionCard unifiée

**Objectif** : fusionner `ActionCard` et `KanbanCard` en un seul composant
avec `variant: "list" | "kanban"`, sans changement visuel perceptible côté
utilisateur au premier merge.

**Fichiers concernés** :
- `src/app/components/ActionCard.tsx` (base conservée, étendue)
- `src/app/components/KanbanCard.tsx` (supprimé en fin de lot, pas avant
  validation complète)
- `src/app/components/KanbanBoard.tsx` (consommateur à migrer)
- `src/app/components/ActionCard.test.tsx`, tests actuels de `KanbanCard`
  (à fusionner dans un seul fichier de test paramétré par variant)
- `src/app/styles/global.css` (classes `.kanban-card-*` à réconcilier avec
  `.action-card-*` sans collision — cf. risque CSS documenté dans la spec)

**Dépendances** : aucune vis-à-vis du Lot 1 (peut être fait en parallèle ou
avant).

**Risques** : 21 tests existants sur `ActionCard.test.tsx` + tests propres à
`KanbanCard` — toute divergence de comportement entre les deux JSX actuels
(checkbox statut absente en Kanban, structure de chips différente) doit être
tranchée explicitement plutôt que fusionnée par défaut : la spec (§21) fixe
`ActionCard` comme référence d'accessibilité — le variant `kanban` **gagne**
la checkbox de statut qu'il n'avait pas, ce n'est pas une régression mais un
gain, à documenter dans le changelog du lot.

**Stratégie de migration** : étape 1, ajouter le prop `variant` à
`ActionCard` avec `variant="list"` par défaut, sans toucher `KanbanCard` ni
`KanbanBoard` (aucun risque, code mort ajouté). Étape 2, implémenter le
rendu `variant="kanban"` en JSX conditionnel interne, valider par un test
dédié qui compare le rendu au comportement actuel de `KanbanCard`
(snapshot/assertions ciblées, pas de snapshot brut). Étape 3, faire consommer
`KanbanBoard` par `ActionCard variant="kanban"` à la place de `KanbanCard`,
supprimer `KanbanCard.tsx` et son fichier de test dans le même commit que la
bascule (jamais orphelin).

**Tests nécessaires** : fusion des suites de tests des deux cartes en une
suite paramétrée ; test de non-régression du drag & drop desktop
(`onDragStart`/`onDragEnd` doivent fonctionner identiquement sous le
variant `kanban`).

**Critères de sortie** : un seul composant carte, `KanbanCard.tsx` supprimé,
`KanbanBoard.tsx` inchangé fonctionnellement, tests verts, aucune classe CSS
orpheline dans `global.css`.

**Rollback** : possible étape par étape (chaque étape est un commit isolé),
revert de l'étape 3 seule suffit à revenir à l'état stable si un problème
apparaît en production après bascule.

---

## Lot 3 — Vue Columns canonique

**Objectif** : construire `ColumnsView` (desktop grille / mobile carrousel)
comme unique implémentation du concept « colonnes par phase », remplaçant à
terme le Kanban desktop actuel ET la vue mobile « par étapes » de
`ProjectWorkspaceScreen`.

**Fichiers concernés** :
- Nouveau : `src/app/components/ColumnsView.tsx`
- `src/app/components/KanbanBoard.tsx` (logique de colonnes/DnD réutilisée
  comme socle interne, pas réécrite)
- `src/app/screens/ProjectWorkspaceScreen.tsx` (consommateur principal)
- `src/app/styles/global.css` (nouveau bloc `.columns-view-*`, carrousel
  mobile)

**Dépendances** : **Lot 2 terminé** (la Vue Colonnes consomme la carte
unifiée, pas `KanbanCard` séparément).

**Risques** : le carrousel mobile introduit un geste de swipe horizontal
entre colonnes qui peut entrer en conflit avec le swipe existant sur les
cartes (terminer/replanifier, mouvement horizontal lui aussi). Mitigation :
le swipe de carte reste capturé au niveau de la carte (`onPointerDown` sur
`.action-card-swipe-content`), le swipe de carrousel doit se déclencher
seulement en dehors de cette zone ou avec un seuil de vélocité distinct —
à valider par test manuel sur device réel avant merge (pas seulement jsdom).

**Stratégie de migration** : construire `ColumnsView` en desktop d'abord
(mode grille, remplace visuellement `KanbanBoard` direct dans
`ProjectWorkspaceScreen` derrière un flag de rendu interne), valider tests
et usage réel, puis ajouter le mode carrousel mobile dans un second commit,
en remplaçant la vue « par étapes » mobile existante seulement une fois le
carrousel validé. Ne jamais avoir les deux implémentations mobiles actives
en même temps au-delà d'un commit transitoire.

**Tests nécessaires** : tests desktop (grille, DnD via carte unifiée) ;
tests mobile (changement de colonne active, contenu de carte identique à la
vue liste) ; test de non-conflit de geste (swipe carte vs swipe carrousel).

**Critères de sortie** : `ProjectWorkspaceScreen` n'a plus qu'une seule
implémentation du concept phase (Colonnes), aucune régression sur le drag &
drop desktop existant, tests verts.

**Rollback** : le commit de bascule mobile (2nd commit) est isolément
revertable sans toucher au gain desktop déjà validé.

---

## Lot 4 — Création inline / rapide

**Objectif** : harmoniser `QuickAddBar` sur tous les écrans de liste
(Home, Cette semaine, Vue Colonnes) et ajouter la création inline en bas de
colonne dans `ColumnsView`.

**Fichiers concernés** :
- `src/app/components/QuickAddBar.tsx`
- `src/app/components/ColumnsView.tsx` (issu du Lot 3, ajout du champ
  inline en pied de colonne)
- Écrans consommateurs : `RunWorkspaceScreen.tsx`, `ProjectWorkspaceScreen.tsx`,
  `AggregatedActionsScreen.tsx`

**Dépendances** : **Lot 3 terminé** (la création inline en colonne dépend
de `ColumnsView`).

**Risques** : faible — extension additive d'un composant déjà stable et
testé. Seul risque : la création inline en colonne doit correctement
préremplir `phaseId` avec la colonne courante (déjà le comportement du bouton
« + » actuel dans `ProjectWorkspaceScreen.tsx:222`, à reproduire à
l'identique, pas à réinventer).

**Stratégie de migration** : un commit par écran consommateur, chacun
testable indépendamment.

**Tests nécessaires** : test de création inline par colonne (phaseId
correct), test de présence de `QuickAddBar` sur Home/Semaine.

**Critères de sortie** : un seul mécanisme de création rapide, cohérent
partout où une liste d'actions est affichée.

**Rollback** : par écran, indépendant.

---

## Lot 5 — Détail action

**Objectif** : construire `ActionDetailSheet`, écran de détail unifié
remplaçant l'éclatement actuel entre `EditActionSheet`/`MoveActionSheet`/
`NotesSheet`/`LinkActionSheet` pour la consultation, tout en conservant ces
sous-formulaires comme briques internes plutôt que de les réécrire.

**Fichiers concernés** :
- Nouveau : `src/app/components/ActionDetailSheet.tsx`
- `src/app/components/EditActionSheet.tsx`, `MoveActionSheet.tsx`,
  `NotesSheet.tsx`, `LinkActionSheet.tsx` (réutilisés comme sous-vues ou
  fusionnés en sections d'un même écran — décision d'implémentation, la
  spec §14 laisse ouvert le choix panneau desktop vs plein écran)
- Tous les écrans qui ouvrent aujourd'hui `EditActionSheet`/`MoveActionSheet`
  séparément (`RunWorkspaceScreen`, `ProjectWorkspaceScreen`,
  `RemindersScreen`, `SearchScreen`, `ActionsByStatusScreen`,
  `AggregatedActionsScreen`)

**Dépendances** : **Lot 2 terminé** (le détail affiche la carte/les mêmes
informations que la carte unifiée). Peut démarrer en parallèle du Lot 3/4.

**Risques** : c'est le lot qui touche le plus grand nombre d'écrans
consommateurs (6 écrans transversaux + les 2 écrans d'espace) — risque de
régression diffus si la migration se fait en un seul commit. Décision
produit préalable requise : §31.3 de la spec (sheet plein écran vs panneau
latéral desktop) doit être tranchée avant de commencer ce lot.

**Stratégie de migration** : construire `ActionDetailSheet` en composition
des sheets existantes (pas de réécriture de leur logique interne), le
brancher d'abord sur **un seul écran** (`RunWorkspaceScreen`, le plus
simple), valider, puis étendre écran par écran aux 7 autres consommateurs.
Ne jamais migrer plus d'un écran par commit.

**Tests nécessaires** : test du nouvel écran de détail (édition, notes,
lien, changement d'axe) ; test de non-régression par écran migré (les
tests existants de chaque écran doivent continuer à passer avec le nouveau
point d'entrée).

**Critères de sortie** : les 8 écrans consommateurs utilisent
`ActionDetailSheet`, aucune perte de fonctionnalité (édition, notes, lien,
déplacement, relance) sur aucun d'eux.

**Rollback** : par écran migré, indépendant (chaque écran garde son ancien
comportement tant qu'il n'est pas explicitement migré dans son propre
commit).

---

## Lot 6 — RUN / PROJET harmonisés

**Objectif** : extraire `SegmentedTabs` partagé (dette documentée dans
l'AUDIT), corriger la confusion `phaseTemplate` du preset `simple` qui mime
les statuts (spec §7/§31.6), garantir que RUN et PROJET utilisent
strictement le même moteur d'affichage de carte/vue.

**Fichiers concernés** :
- Nouveau : `src/app/components/SegmentedTabs.tsx`
- `src/app/screens/RunWorkspaceScreen.tsx`,
  `src/app/screens/ProjectWorkspaceScreen.tsx` (consommateurs)
- `src/presets/preset-registry.ts` (ajustement de `phaseTemplate` du preset
  `simple`, décision §31.6 à trancher avant ce lot)

**Dépendances** : **Lots 2 et 3 terminés** (harmonisation suppose la carte
et la vue Colonnes déjà unifiées).

**Risques** : le changement de `phaseTemplate` du preset `simple` modifie
une donnée de configuration consommée par les actions existantes
(`Action.phaseId` référence ces valeurs) — tout changement de libellé de
phase doit passer par une table de correspondance (même mécanisme que
`LEGACY_PHASE_COLUMNS` déjà existant) pour ne pas casser l'affichage des
actions déjà créées avec l'ancien `phaseTemplate`.

**Stratégie de migration** : extraire `SegmentedTabs` d'abord (risque nul,
pur refactor de présentation, un commit par écran migré). Puis, seulement
si la décision §31.6 opte pour un changement de `phaseTemplate`, ajouter une
entrée de correspondance dans le mécanisme de compatibilité existant plutôt
que de renommer en place.

**Tests nécessaires** : `SegmentedTabs.test.tsx` nouveau ; tests des deux
écrans consommateurs inchangés dans leur comportement observable ; test de
compatibilité ascendante si `phaseTemplate` change.

**Critères de sortie** : un seul composant `SegmentedTabs`, aucune
régression d'affichage pour les actions existantes quelle que soit leur
`phaseId` d'origine.

**Rollback** : extraction `SegmentedTabs` revertable seule ; changement de
`phaseTemplate` revertable indépendamment.

---

## Lot 7 — Semaine / Aujourd'hui (Home)

**Objectif** : construire Home (spec §12 : Aujourd'hui + En retard + Bloqué
+ raccourci Semaine) et fusionner les deux implémentations actuelles de la
Vue Semaine (`AggregatedActionsScreen` et le mode « Par semaine » de
`ProjectWorkspaceScreen`) derrière une fonction de regroupement partagée.

**Fichiers concernés** :
- `src/app/screens/AggregatedActionsScreen.tsx` (devient Home pour la route
  `today`, garde son rôle actuel pour `week`)
- `src/app/screens/ProjectWorkspaceScreen.tsx` (mode semaine à faire
  consommer la même fonction de regroupement)
- Nouveau : `src/app/utils/home-sections.ts` (sélecteurs « en retard »/
  « bloqué », purs, testables isolément — cf. principe n°7, aucun besoin de
  toucher au domaine)

**Dépendances** : **Lot 2 terminé** (Home affiche la carte unifiée). Le
statut « bloqué » dépend de la décision §31.1 (vrai statut domaine vs badge
dérivé) — si la décision opte pour un vrai statut, ce lot dépend aussi d'un
lot domaine préalable non listé ici (à ajouter si tranché ainsi) ; si la
décision opte pour un badge dérivé (recommandé par défaut pour respecter le
principe n°7), aucune dépendance domaine supplémentaire.

**Risques** : le bloc « En retard » nécessite de comparer `schedule` à la
date courante pour tous les statuts ≠ `done` — logique nouvelle mais pure,
à bien couvrir de tests (fuseaux horaires, granularités `day`/`week`/`month`
différentes) en s'appuyant sur `calendar-engine.ts` existant plutôt que
recoder une comparaison de dates.

**Stratégie de migration** : construire les sélecteurs purs
(`home-sections.ts`) et leurs tests en premier, indépendamment de l'UI.
Ajouter les blocs Home dans un commit séparé de la fusion de la logique
Semaine (deux changements indépendants, pas de raison de les coupler).

**Tests nécessaires** : tests unitaires de `home-sections.ts` (en retard,
bloqué, cas limites de fuseaux/granularité) ; test d'écran Home ; test de
non-régression de la Vue Semaine fusionnée.

**Critères de sortie** : Home répond aux 4 questions du brief sans aucun
graphique décoratif ; une seule implémentation de la logique de
regroupement Semaine.

**Rollback** : les deux commits (sélecteurs Home / fusion Semaine) sont
indépendamment revertables.

---

## Lot 8 — Collaboration légère

**Objectif** : exposer `collaborationMode` (Solo/Équipe) et `assigneeIds`
a minima, conformément à la spec §15 — sans RBAC, chat, ni organisation.

**Fichiers concernés** :
- `src/app/screens/ApproachSettingsScreen.tsx` (toggle Solo/Équipe)
- Nouveau : `src/app/components/AssigneeChip.tsx`,
  `src/app/components/AssigneePicker.tsx`
- Carte unifiée (issue du Lot 2) : affichage conditionnel du chip
  responsable
- `src/app/utils/filter-actions.ts` (extension `ActionFilters` avec un
  `Set<string>` d'assigneeIds)
- `src/app/components/FilterSheet.tsx` (nouvelle section filtre responsable)
- Potentiellement `supabase/migrations/` **si et seulement si** la décision
  §31.4 opte pour une table `projets_members` plutôt que des identifiants
  locaux libres — à confirmer avant ce lot, aucune migration créée par
  défaut.

**Dépendances** : **Lots 2 et 5 terminés** (le chip responsable s'affiche
sur la carte unifiée et se règle depuis le détail d'action). Décision
produit §31.4 tranchée avant de commencer.

**Risques** : c'est le seul lot qui peut nécessiter un changement de schéma
Supabase (cf. décision §31.4). Si une table `projets_members` est jugée
nécessaire, elle doit suivre le pattern RLS déjà en place
(`user_hash = (select ...)`) et faire l'objet d'une migration dédiée, jamais
d'une modification manuelle en base (invariant de la baseline). Risque
produit : sans source de vérité des membres, le picker de responsable
propose des identifiants libres, ce qui peut créer des doublons/fautes de
frappe — accepté comme limite V1 explicite si la décision opte pour cette
voie.

**Stratégie de migration** : implémenter le toggle Solo/Équipe en premier
(commit isolé, aucun risque, champ déjà dans le modèle). Puis le filtre par
responsable (extension additive de `ActionFilters`, pattern déjà éprouvé).
Puis l'affichage du chip sur la carte (dépend du Lot 2). La création de
table `projets_members`, si actée, fait l'objet d'un commit Supabase séparé
avec sa propre migration versionnée, avant le picker qui la consomme.

**Tests nécessaires** : test du toggle Solo/Équipe (n'affecte aucune action
existante, même garantie que `changeWorkspaceApproach` par construction) ;
test du filtre responsable ; test d'affichage conditionnel du chip
(absent en Solo, présent en Équipe avec assignés).

**Critères de sortie** : un projet Équipe permet d'assigner et de filtrer
par responsable sans qu'aucune permission ni notion de rôle n'apparaisse
dans l'UI.

**Rollback** : chaque commit (toggle / filtre / chip / migration éventuelle)
indépendamment revertable.

---

## Lot 9 — Polish / cohérence / accessibilité

**Objectif** : passe transverse de cohérence visuelle et d'accessibilité sur
l'ensemble des écrans touchés par les lots 1-8, sans ajouter de nouvelle
fonctionnalité.

**Fichiers concernés** : `src/app/styles/global.css` (nettoyage des
classes orphelines issues des fusions, vérification qu'aucune collision de
nom n'a été introduite), tous les composants créés dans les lots
précédents (audit `aria-*` systématique).

**Dépendances** : **Lots 1 à 8 terminés** (ou au minimum les lots que le
produit décide de livrer — ce lot peut être partiel si certains lots
antérieurs sont repoussés).

**Risques** : faible — travail de finition, pas de nouvelle logique
métier. Le seul risque est temporel (ce lot peut être sous-estimé s'il
révèle des incohérences accumulées sur 8 lots).

**Stratégie de migration** : audit systématique écran par écran (checklist
issue de la spec §21 Accessibilité), corrections en petits commits ciblés
par écran ou par type de problème (ex. un commit « contrastes couleur », un
commit « labels aria manquants »).

**Tests nécessaires** : pas de nouveaux tests fonctionnels, mais vérification
manuelle avec lecteur d'écran sur les nouveaux écrans (Vue Colonnes, Home,
Détail action) — à documenter dans le commit puisque non automatisable
entièrement.

**Critères de sortie** : aucune régression d'accessibilité mesurable par
rapport à l'état avant le chantier (référence : mécanismes déjà en place
listés dans l'AUDIT — annonceur, safe-areas, reduced-motion, cibles ≥44px).

**Rollback** : par commit ciblé, sans impact sur les lots fonctionnels.

---

## Lot 10 — Nettoyage ancien code

**Objectif** : supprimer le code devenu mort une fois tous les lots
précédents validés en usage réel — jamais avant.

**Fichiers concernés** (candidats, à confirmer un par un au moment du lot) :
- Ancienne vue mobile « par étapes » de `ProjectWorkspaceScreen` si non déjà
  supprimée au Lot 3.
- `useSecondTabPreference` si Rappels est devenu un onglet fixe et que la
  personnalisation n'a plus de sens (décision à confirmer, pas actée dans
  ce plan — voir risque Lot 1).
- Réexamen de `src/migration/migrate-legacy-actions.ts` : toujours
  **hors périmètre de suppression automatique** — la décision de la
  baseline (conservé, candidat documenté) reste valable ; ce lot peut au
  mieux proposer sa suppression avec preuve à jour, jamais la décider
  unilatéralement.

**Dépendances** : **tous les lots précédents livrés et validés en usage
réel** (pas seulement mergés — un délai d'observation est recommandé avant
suppression définitive).

**Risques** : suppression prématurée si un lot antérieur a été livré
partiellement (ex. un seul écran migré sur 8 pour le Lot 5) — vérifier
explicitement l'état de complétude de chaque lot avant de supprimer son
ancien code.

**Stratégie de migration** : un commit de suppression par élément de code
mort identifié, jamais un commit de nettoyage global — chaque suppression
doit pouvoir être reliée à la preuve de son remplacement complet (référence
au commit du lot qui l'a remplacé).

**Tests nécessaires** : suite complète verte après chaque suppression
(garantit qu'aucun test ne référence encore le code supprimé).

**Critères de sortie** : plus aucune double implémentation identifiée dans
`docs/AUDIT.md`/`docs/PRODUCT-RENEWAL-SPEC.md` ne subsiste, sauf celles
explicitement actées comme conservées (ex. `migrate-legacy-actions.ts`).

**Rollback** : chaque suppression étant son propre commit, un revert ciblé
restaure l'élément si un usage non anticipé est découvert.

---

## Estimation risque / effort par lot

| Lot | Effort | Risque | Justification courte |
| --- | --- | --- | --- |
| 1 — Navigation + shell | Faible | Faible | Renommage de libellés, pas de logique nouvelle |
| 2 — ActionCard unifiée | Moyen | Moyen | Nombreux tests existants à préserver, fusion JSX |
| 3 — Vue Columns canonique | Élevé | Moyen-élevé | Nouveau pattern carrousel mobile, conflit de gestes possible |
| 4 — Création inline / rapide | Faible | Faible | Extension additive d'un composant déjà stable |
| 5 — Détail action | Élevé | Moyen-élevé | 8 écrans consommateurs à migrer un par un |
| 6 — RUN/PROJET harmonisés | Moyen | Faible-moyen | Extraction de composant + donnée de config sensible (phaseTemplate) |
| 7 — Semaine / Home | Moyen | Moyen | Nouvelle logique « en retard » à bien tester (dates/fuseaux) |
| 8 — Collaboration légère | Moyen | Moyen (élevé si migration Supabase) | Dépend d'une décision produit non tranchée (§31.4) |
| 9 — Polish / accessibilité | Moyen | Faible | Pas de logique nouvelle, mais travail diffus |
| 10 — Nettoyage ancien code | Faible | Faible (si discipline de séquencement respectée) | Suppressions ciblées, chaque preuve déjà établie par les lots précédents |
