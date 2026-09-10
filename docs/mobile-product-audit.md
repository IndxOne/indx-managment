# Audit produit mobile — INDXONE Projets

Date de l'audit : 10 septembre 2026.

## Périmètre et méthode

Cet audit porte sur l'application React/PWA présente dans ce dépôt. Il s'appuie
sur l'architecture des écrans, les composants interactifs, les styles
responsive, le manifeste PWA et les tests automatisés. Il ne remplace pas une
étude analytics ou des entretiens utilisateurs : aucune donnée de production
(taux de complétion, appareils, abandons) n'est disponible dans le dépôt.

Trois parcours mobiles structurants ont été examinés :

1. retrouver ce qui doit être fait aujourd'hui ou cette semaine ;
2. créer une action et la faire progresser ;
3. naviguer entre espaces, rappels, carnet et réglages.

## Diagnostic de l'existant

### Ce qui fonctionne déjà bien

- **Fondations réellement mobile-first.** La navigation basse comporte quatre
  destinations stables et les cibles tactiles utilisent une taille minimale de
  44 px. Le layout bascule vers une sidebar seulement à partir de 1 024 px.
- **Capture rapide efficace.** Le champ d'ajout reste visible dans les espaces,
  crée une action à la validation et conserve le focus pour permettre la saisie
  en série. Les options avancées restent accessibles sans alourdir le chemin
  principal.
- **Bonne couverture fonctionnelle.** Aujourd'hui, Semaine, Espaces, recherche,
  rappels, carnet, vues par statut et réglages sont présents. Les espaces RUN et
  PROJET bénéficient de vues adaptées à leur usage.
- **Accessibilité prise en compte.** Les états actifs utilisent `aria-current`,
  les onglets `aria-selected`, un annonciateur vocal est fourni et les
  animations respectent `prefers-reduced-motion`.
- **PWA déjà distribuable.** Le manifeste, les icônes, les captures store et le
  service worker sont configurés. Le cache reste volontairement limité à
  l'app-shell, ce qui évite de présenter des données métier périmées comme
  synchronisées.

### Frictions et risques mobiles

| Priorité | Constat | Effet utilisateur | Recommandation |
| --- | --- | --- | --- |
| P0 | Les données Supabase ne disposent pas d'un véritable mode hors-ligne. | L'app s'ouvre hors connexion mais les actions ne sont pas fiables ou modifiables. | Ajouter une file locale chiffrée d'opérations, un état « à synchroniser » par action et une résolution explicite des conflits. |
| P0 | La barre basse réservait 20 px fixes et le haut ne tenait pas compte des encoches. | Contrôles trop proches de l'indicateur d'accueil ou titre sous la zone système sur certains appareils/PWA. | Utiliser `viewport-fit=cover` et les variables `safe-area-inset-*` (premier correctif livré avec cet audit). |
| P1 | « Plus » concentre de nombreuses fonctions alors que Rappels peut être une destination fréquente. | Deux gestes sont nécessaires pour consulter un signal urgent ; la découvrabilité baisse. | Mesurer les ouvertures, puis autoriser l'utilisateur à remplacer « Semaine » ou « Plus » par Rappels dans la barre basse. |
| P1 | Les vues Aujourd'hui/Semaine agrègent les actions mais n'offrent pas de geste de planification rapide. | Replanifier ou changer le statut impose d'ouvrir des menus successifs. | Ajouter des actions de swipe progressives et toujours proposer leur équivalent via le menu accessible. |
| P1 | Le feedback hors-ligne est global et binaire. | L'utilisateur ne sait pas si une action est sauvegardée, en attente ou en conflit. | Afficher un badge de synchronisation discret sur les éléments concernés et un résumé dans Rappels/Plus. |
| P2 | Les cartes affichent beaucoup d'informations avec une hiérarchie uniforme. | Le scan à une main devient lent lorsque la liste s'allonge. | Introduire une densité « compacte/confortable », mettre en avant échéance et attente, puis reléguer les métadonnées secondaires. |
| P2 | La création avancée repose sur plusieurs sélecteurs natifs dans une sheet. | Le clavier et les pickers réduisent fortement la zone utile sur petit écran. | Transformer type/priorité en boutons segmentés ou chips, garder un seul sélecteur complexe ouvert à la fois et rendre l'action principale collante. |
| P2 | La recherche est une destination secondaire dans « Plus ». | Retrouver une action ancienne demande une navigation préalable. | Ajouter un geste « tirer pour rechercher » ou un bouton recherche dans l'en-tête des listes, sans ajouter un cinquième onglet permanent. |

## Proposition d'évolution

### Lot 1 — Fiabilité et confort immédiat (1 sprint)

1. **Zones sûres sur iOS/Android.** Correctif CSS et viewport livré dans cette
   branche. Vérifier sur iPhone SE, iPhone avec Dynamic Island et Android avec
   navigation gestuelle.
2. **Clavier mobile.** Sur les sheets de création/édition, garder le bouton de
   validation visible au-dessus du clavier virtuel et faire défiler le premier
   champ invalide dans la zone visible.
3. **États de chargement locaux.** Préférer un skeleton à hauteur stable dans
   les listes, conserver la barre de navigation interactive et annoncer les
   erreurs près de l'action qui les a déclenchées.
4. **Instrumentation minimale.** Mesurer sans contenu métier : destination
   ouverte, création rapide/avancée, succès/échec, temps jusqu'à la première
   action et abandon d'une sheet.

**Critères de succès :** aucune cible masquée par une zone système ; moins de
2 % d'erreurs de création ; p95 du temps création rapide inférieur à 5 s.

### Lot 2 — Exécution à une main (1 à 2 sprints)

1. Ajouter sur les cartes un swipe court vers la droite pour terminer et vers
   la gauche pour replanifier, avec seuil, aperçu de l'action et annulation.
2. Fournir un retour haptique uniquement si l'application est installée et si
   la plateforme le permet ; ne jamais le rendre indispensable.
3. Rendre le bouton d'ajout contextuel accessible depuis Aujourd'hui et
   Semaine, avec choix de l'espace mémorisé.
4. Proposer une préférence de densité et mémoriser le dernier mode de vue par
   espace.

**Critères de succès :** baisse de 25 % du nombre médian de taps pour terminer
ou replanifier une action ; taux d'annulation après swipe inférieur à 8 %.

### Lot 3 — Offline utile et personnalisation (2 à 3 sprints)

1. Stocker localement les lectures récentes et les mutations en attente.
2. Réconcilier les opérations avec identifiants idempotents ; afficher les
   conflits au lieu d'écraser silencieusement une version distante.
3. Permettre de personnaliser une destination de la barre basse à partir d'une
   liste courte (Rappels, Recherche, Carnet).
4. Ajouter un widget/shortcut PWA « Nouvelle action » si les mesures montrent
   que la capture représente un usage majoritaire.

**Critères de succès :** aucune perte de mutation lors d'une coupure réseau de
30 minutes ; synchronisation visible en moins de 10 s après reconnexion ; au
moins 20 % des utilisateurs récurrents configurent un raccourci.

## Principes d'interaction à conserver

- Une action fréquente doit rester disponible en un geste, mais toute action
  gestuelle doit avoir un équivalent visible et accessible.
- Les statuts ne doivent jamais reposer uniquement sur la couleur.
- Une mutation optimiste doit toujours être annulable et montrer son état de
  synchronisation.
- La barre basse reste limitée à quatre destinations pour éviter les libellés
  tronqués et les petites cibles.
- Les animations restent courtes, non bloquantes et supprimées lorsque
  `prefers-reduced-motion` est actif.

## Plan de validation

- **Appareils :** 320 × 568, 360 × 800, 390 × 844, 412 × 915, tablette 768 px.
- **Contextes :** Safari/PWA iOS, Chrome/PWA Android, thème clair/sombre, texte
  agrandi à 200 %, orientation paysage et navigation gestuelle.
- **Scénarios :** créer dix actions d'affilée, modifier la dernière avec clavier
  ouvert, perdre/récupérer le réseau, traiter un rappel, rechercher une action,
  annuler un déplacement et revenir à l'espace d'origine.
- **Accessibilité :** parcours clavier, VoiceOver/TalkBack, zoom 200 %, contraste
  et absence d'information transmise uniquement par couleur ou mouvement.

## Décision recommandée

Ne pas lancer une refonte visuelle globale. L'interface actuelle possède déjà
une cohérence mobile et de bonnes fondations d'accessibilité. Prioriser la
fiabilité perçue (zones sûres, clavier, synchronisation), puis réduire les taps
des deux gestes quotidiens — terminer et replanifier — avant de personnaliser
la navigation. Les données d'instrumentation du lot 1 doivent décider de
l'ordre exact des lots 2 et 3.
