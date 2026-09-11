# Lot 8.1 — validation navigateur

Validation réalisée le 11 septembre 2026 avec Chromium 140 headless, lancé par
un Playwright installé uniquement dans `/tmp` (aucune dépendance ajoutée au
projet). Le serveur utilisé était le serveur Vite local.

## Résultats exécutés

### Desktop — 1440 × 1000

- [x] passage Solo → Équipe sur un PROJET et un RUN ;
- [x] ajout de trois membres, renommage d'Alice en Alicia et désactivation de
  Koffi dans les réglages ;
- [x] assignation depuis ActionDetail (un et trois responsables) ;
- [x] filtre Responsable du RUN ;
- [x] filtre Responsable du PROJET dans la vue Columns puis dans la vue
  Semaine ;
- [x] Columns filtrées, avec disparition des cartes hors filtre ;
- [x] membre désactivé encore visible sur la carte déjà assignée, mais absent
  des choix normaux du filtre et de nouvelle assignation.

### Mobile — 390 × 844

- [x] réglages des membres et sélection d'un responsable ;
- [x] ouverture d'ActionDetail ;
- [x] cartes avec deux identités au maximum puis `+N` ;
- [x] ouverture et sélection des filtres RUN et PROJET ;
- [x] focus placé dans les sheets et rendu des contrôles de membre/filtre avec
  leurs libellés tactiles ;
- [x] aucune largeur de document supérieure au viewport dans les écrans RUN et
  PROJET testés.

## Persistance — limite de l'environnement local

Le rechargement/persistance n'est pas validable honnêtement avec ce serveur :
aucune configuration Supabase n'est fournie et l'application choisit donc son
adaptateur mémoire, conçu pour repartir d'un état vide au rechargement. Cette
limite ne constitue pas une validation de la persistance Supabase.

Checklist humaine à exécuter sur un environnement relié à Supabase :

1. passer un espace de Solo à Équipe ;
2. ajouter, renommer puis désactiver un membre ;
3. assigner deux actions, dont une au membre ensuite désactivé ;
4. sélectionner successivement `Tous`, un membre actif et `Non assigné` dans
   RUN, puis dans les vues Columns et Semaine d'un PROJET ;
5. recharger la page après chaque mutation et confirmer la conservation du
   mode, des membres, de leur état actif, des assignations et du filtre attendu
   par le produit ;
6. confirmer que le membre inactif reste affiché sur l'action historique, sans
   redevenir sélectionnable pour une nouvelle assignation.

## Audit de densité

Le rendu responsable de `ActionCard` est absent en Solo. En Équipe, il reste
dans la ligne de métadonnées, affiche au plus deux groupes d'initiales suivis de
`+N`, et n'a produit ni wrap supplémentaire de titre ni débordement horizontal
à 390 px. Aucun ajustement visuel n'a donc été nécessaire pour ce lot.
