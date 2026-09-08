# INDXONE Projets — Cadrage maître V1

**Statut :** cadrage développement
**Référence UX validée :** prototype V1 du 8 septembre 2026
**Orientation :** mobile-first, simple pour non-techniciens
**Interdiction :** ne pas recréer le produit dans Lovable ou Sites

## 1. Décision produit

INDXONE Projets repose sur trois dimensions distinctes :

- **Nature de l'espace** : RUN ou PROJET.
- **Approche métier** : choisie pour chaque espace.
- **Vue** : manière temporaire d'afficher les mêmes données.

Cette séparation est obligatoire. Un utilisateur peut être Administrateur SI dans un espace RUN et Chargé de projet SI dans un espace PROJET, sans changer de profil global.

### Vocabulaire canonique

- **Espace** : conteneur de travail.
- **RUN** : activité continue, sans date de fin obligatoire.
- **PROJET** : initiative bornée, structurée par phases et livrables.
- **Approche métier** : préréglage influençant affichage, libellés, champs visibles, filtres et automatismes proposés.
- **Vue** : regroupement par jour, semaine, phase, statut ou responsable.
- **Action** : unité de travail commune à tous les espaces.

## 2. Analyse des retours

| Retour | Pertinence | Décision |
|---|---|---|
| Approche RUN | Critique | Intégrer au modèle produit |
| Approche choisie par projet | Critique | Configuration portée par chaque espace |
| Approche influençant l'affichage | Forte | Utiliser des préréglages déclaratifs |
| Double rôle Admin SI / CDP SI | Structurant | Ne jamais déduire l'approche depuis le profil utilisateur |
| Calendrier automatique | Critique | Centraliser dans un moteur métier |
| Glisser-déposer | Utile | Interaction secondaire sur mobile |
| Mobile-first | Critique | Concevoir gestes, densité et navigation depuis 360 px |

### Risque principal

Éviter un « mini ClickUp ». Les approches métier ne doivent pas créer plusieurs produits, plusieurs modèles de données ou des menus permanents. Elles configurent un même moteur.

## 3. Positionnement fonctionnel

### Espace RUN

Usage continu : demandes, incidents, contrôles, maintenance, relances, actions récurrentes.

Affichage initial recommandé : aujourd'hui, cette semaine, en attente, échéances proches.

Exemple :
- « Investiguer les droits d'accès d'un compte externe » — 09/09
- « Mettre à jour le questionnaire de chiffrage » — 11/09

### Espace PROJET

Usage borné : cadrage, ateliers, réalisations, validations, restitutions, clôture.

Exemple : « Mise en conformité cybersécurité » avec ateliers, réalisations et remontées d'avancement.

## 4. Approches métier V1

| Code | Public | Affichage initial | Éléments mis en avant |
|---|---|---|---|
| `simple` | Non-techniciens | Semaine | Titre, statut, échéance |
| `it_ops` | Admin SI, support, exploitation | Jour/semaine | Catégorie, priorité, attente, récurrence |
| `project_amoa` | CDP, AMOA, PMO, PO | Phase | Livrable, jalon, décision, risque |
| `product_tech` | Dev, Tech Lead, CTO | Statut/sprint | Backlog, revue, dette, incident |
| `management` | Manager, superviseur | Responsable/statut | Charge, blocage, échéance |

### Règle fondamentale

Changer d'approche :
- ne supprime aucune donnée ;
- ne change aucun statut ;
- ne déplace aucune action ;
- modifie seulement configuration et présentation ;
- demande confirmation si certains champs deviennent masqués.

## 5. Matrice nature × approche

Combinaisons MVP :

| Nature | Approche recommandée | Vue initiale |
|---|---|---|
| RUN | simple | Semaine |
| RUN | it_ops | Aujourd'hui |
| RUN | management | Responsable |
| PROJET | simple | Phase |
| PROJET | project_amoa | Phase |
| PROJET | product_tech | Statut ou sprint |
| PROJET | management | Responsable |

Combinaisons non recommandées restent autorisées après avertissement discret. Aucun blocage artificiel.

## 6. Modèle fonctionnel

### Workspace

```ts
type WorkspaceKind = "run" | "project";
type ProfessionalApproach =
  | "simple"
  | "it_ops"
  | "project_amoa"
  | "product_tech"
  | "management";
type CollaborationMode = "solo" | "team";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  kind: WorkspaceKind;
  approach: ProfessionalApproach;
  collaborationMode: CollaborationMode;
  presetVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

### Action

```ts
type ActionStatus = "todo" | "doing" | "waiting" | "done";
type Priority = "high" | "normal" | "low";
type WorkItemType =
  | "task"
  | "request"
  | "incident"
  | "maintenance"
  | "deliverable"
  | "milestone";

interface Action {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: Priority;
  itemType: WorkItemType;
  phaseId?: string;
  schedule?: Schedule;
  assigneeIds: string[];
  tags: string[];
  sourceNoteId?: string;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

### Planification

Éviter plusieurs champs contradictoires `dueDate`, `week` et `month`.

```ts
type Schedule =
  | { granularity: "day"; value: string }   // YYYY-MM-DD
  | { granularity: "week"; value: string }  // YYYY-Www
  | { granularity: "month"; value: string } // YYYY-MM
  | { granularity: "none" };
```

Jour, semaine et mois d'affichage sont dérivés par le moteur calendrier.

### Déplacement temporel

- Jour vers autre semaine : conserver le jour de semaine.
- Semaine vers autre semaine : remplacer la valeur ISO.
- Mois vers semaine : changer la granularité après confirmation.
- Déplacement de phase : ne jamais modifier calendrier ou statut.
- Déplacement de statut : ne jamais modifier phase ou calendrier.

## 7. Préréglages métier

Chaque préréglage doit être déclaratif :

```ts
interface WorkspacePreset {
  id: ProfessionalApproach;
  allowedKinds: WorkspaceKind[];
  defaultView: "day" | "week" | "phase" | "status" | "assignee";
  visibleFields: string[];
  quickFilters: string[];
  suggestedAutomations: string[];
  statusLabels?: Partial<Record<ActionStatus, string>>;
  phaseTemplate?: string[];
}
```

Interdiction d'éparpiller des conditions `if approach === ...` dans les composants.

## 8. Parcours mobile-first

### Création d'espace

Parcours court :
1. Nom.
2. « Travail continu » ou « Projet avec étapes ».
3. Approche proposée, modifiable.
4. Création immédiate.

Valeurs proposées :
- RUN → approche `it_ops` si utilisateur la choisit ;
- PROJET → approche `project_amoa` ;
- mode collaboratif → `solo` par défaut.

### Navigation mobile

Navigation basse recommandée : Aujourd'hui, Semaine, Espaces, Plus.

« Rappels », « Carnet », « Hub » et réglages restent dans « Plus » ou contexte espace.

### Vue espace

- En-tête compact : nom + badges RUN/PROJET + approche.
- Un seul axe visible à la fois.
- Sélecteur d'axe sous forme de bouton ou bottom sheet.
- Cartes lisibles à 360 px.
- Action principale persistante « + ».
- Filtres dans un panneau inférieur.

### Déplacement mobile

Le glisser-déposer ne doit jamais être obligatoire.
- Appui sur « Déplacer » → bottom sheet.
- Glisser-déposer tactile facultatif après validation terrain.
- Retour haptique si disponible.
- Annulation proposée après déplacement.

## 9. Règles calendrier

- Semaines ISO 8601.
- Locale fr-FR.
- Fuseau configurable ; défaut utilisateur.
- Reconnaissance dynamique des passages mois/année.
- Libellés relatifs : Aujourd'hui, Demain, Cette semaine, Semaine prochaine, Ce mois-ci.
- Calcul centralisé et testé.
- Aucun numéro de semaine codé en dur.
- Saisie naturelle (« vendredi prochain ») hors MVP initial, prévue derrière une interface `DateParser`.

## 10. Rappels et récurrence

MVP :
- relance après N jours au statut `waiting` ;
- répétition quotidienne, hebdomadaire ou mensuelle ;
- génération idempotente ;
- historique minimal de déclenchement ;
- possibilité de désactiver sans supprimer les occurrences existantes.

RUN privilégie récurrence et attente. PROJET privilégie jalons et échéances.

## 11. Articulation Carnet et Hub

### Carnet

- Une note peut produire une action.
- L'action conserve `sourceNoteId`.
- Aucun contenu de note dupliqué inutilement.
- Suppression de la note ne supprime pas l'action.

### Hub

- Un espace peut référencer un objectif Hub.
- Les indicateurs financiers restent propriété de Hub.
- Projets consomme uniquement un résumé autorisé.
- Aucun calcul TJM ou trésorerie dans Projets.

## 12. Architecture attendue

Séparer : domaine, moteur calendrier, moteur de préréglages, persistance, interface, intégrations Carnet/Hub.

Logique métier indépendante du frontend. Aucun composant ne calcule directement semaines, récurrences ou transitions.

## 13. Exigences non fonctionnelles

- Mobile : 360 × 800 minimum.
- Cibles tactiles : 44 × 44 px.
- Navigation clavier complète.
- Contrastes WCAG AA.
- `prefers-reduced-motion` respecté.
- Chargement initial sobre.
- Pas de dépendance lourde sans justification.
- Pas de données fictives dans la couche production.
- Migration versionnée.
- Aucun push ou déploiement production sans validation explicite.

## 14. Lots

### Lot 0 — Audit
- inspecter dépôt, architecture, tests, persistance ;
- identifier dette héritée du prototype ;
- produire matrice impact ;
- aucun développement.

### Lot 1 — Domaine
- Workspace RUN/PROJET ;
- approche par espace ;
- Schedule ;
- préréglages déclaratifs ;
- migrations ;
- tests unitaires.

### Lot 2 — Parcours mobile
- création d'espace ;
- badges ;
- vue dérivée ;
- changement d'approche ;
- bottom sheets ;
- tests composants.

### Lot 3 — RUN
- Aujourd'hui ;
- semaine roulante ;
- types d'action ;
- récurrence ;
- attente et relance.

### Lot 4 — PROJET
- phases configurables ;
- livrables et jalons ;
- décisions/risques en champs progressifs ;
- restitution.

### Lot 5 — Transversal
- Cette semaine ;
- filtres ;
- Carnet ;
- Hub ;
- équipes.

### Lot 6 — Recette
- non-régression ;
- accessibilité ;
- responsive ;
- migration ;
- performances ;
- sécurité.

## 15. Critères d'acceptation globaux

- Chaque espace possède une nature et une approche.
- Deux espaces du même utilisateur peuvent utiliser des approches différentes.
- Changer l'approche modifie l'affichage sans altérer les actions.
- RUN fonctionne sans phases obligatoires.
- PROJET peut fonctionner par phases.
- « Cette semaine » agrège RUN et PROJET.
- Calendrier ne contient aucune semaine codée en dur.
- Déplacement conserve propriétés non concernées.
- Mobile permet toutes les actions sans glisser-déposer.
- Données existantes migrent sans perte.
- Tests couvrent changements d'année, fuseaux et récurrences.

## 16. Hors périmètre immédiat

- statuts totalement personnalisables ;
- diagramme de Gantt ;
- facturation ;
- chat interne ;
- synchronisation Git ;
- IA générative ;
- parsing complet du langage naturel ;
- gestion fine des droits multi-organisations.

## 17. Scénarios de recette

### Scénario A — RUN IT
1. Créer « RUN SI quotidien ».
2. Choisir RUN + IT Ops + Solo.
3. Ajouter investigation droits externes au 09/09.
4. Ajouter questionnaire chiffrage au 11/09.
5. Vérifier affichage Aujourd'hui/Semaine.
6. Passer investigation en attente.
7. Activer relance après trois jours.

### Scénario B — Projet cybersécurité
1. Créer « Mise en conformité Cybersec ».
2. Choisir PROJET + Projet/AMOA.
3. Vérifier phases proposées.
4. Ajouter atelier, réalisation, restitution.
5. Déplacer atelier entre phases.
6. Vérifier dates/statuts inchangés.

### Scénario C — Changement d'approche
1. Créer un espace.
2. Ajouter trois actions.
3. Changer approche.
4. Vérifier nouvelles vue et terminologie.
5. Vérifier intégrité complète des données.
