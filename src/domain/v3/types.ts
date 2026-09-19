/**
 * Modèle métier V3 (Lot 1, cahier §9.2) — additif et isolé du domaine V2
 * (src/domain/*.ts, jamais modifié ici). Aucune dépendance React/Supabase :
 * uniquement des types et fonctions pures, testables sans environnement.
 *
 * Audit préalable (cf. rapport) : itemType (V2, 8 valeurs) n'est branché
 * dans aucune logique métier — chip/icône d'affichage uniquement, "task"
 * en valeur par défaut à 4 endroits. decision/risk/milestone en sortent
 * comme entités V3 à part entière (états propres, cf. WorkItemType
 * ci-dessous réduit à 5 valeurs d'exécution).
 *
 * Classification Entité / Value Object / Projection (§9.2) :
 *
 * ENTITÉS (identité stable, cycle de vie propre, référencées ailleurs) :
 *   Project, Objective, Stage, WorkItem, Decision, Risk, Issue, Milestone,
 *   Dependency, ChangeRequest, Evidence.
 *
 * Objective est une entité séparée (corrigé le 20/09/2026, décision GO
 * conditionnel) : Project.objective en champ unique bloquait les objectifs
 * multiples, l'ownership et le statut propres, et la traçabilité. Un
 * Project porte désormais `objectiveIds: EntityId[]`.
 *
 * VALUE OBJECTS (aucune identité propre, définis entièrement par leur
 * contenu, remplacés en bloc plutôt que mutés champ à champ) :
 *   Schedule (déjà ce patron en V2), AcceptanceCriterion, ImpactAssessment
 *   (ChangeRequest), RiskAssessment (probabilité × impact → criticité).
 *
 * PROJECTIONS (calculées à la lecture, jamais stockées ni mutées
 * directement — cf. cahier §12.1 "Le brief est une vue calculée") :
 *   aucune projection n'est modélisée dans ce lot ; Mon Brief (Lot 3) et
 *   Northstar (Lot 7) consommeront ces entités en lecture seule.
 *
 * Écarts assumés vs la hiérarchie §9.1 (documentés dans le rapport) :
 *   - Meeting et Assumption ne sont PAS dans la liste "objets
 *     obligatoires" de §9.2 (seulement mentionnés dans la hiérarchie/les
 *     workflows) : différés à un lot ultérieur (Meeting → Lot 6
 *     Gouvernance, qui les cite explicitement).
 *   - FollowUp (RUN) : différé également, hors du périmètre §9.2.
 */

// ===========================================================================
// Primitives partagées
// ===========================================================================

/** Toutes les dates du domaine sont des chaînes ISO 8601 injectées par
 * l'appelant (cahier §16.2 : "les dates sont injectées, jamais lues
 * directement dans le domaine") — jamais `new Date()` dans ce module. */
export type IsoDateTime = string;

export type EntityId = string;

export type Criticality = "low" | "medium" | "high" | "critical";

// ===========================================================================
// Project
// ===========================================================================

export type ProjectMethod = "predictive" | "agile" | "hybrid" | "run";

export type ProjectStatus = "on_track" | "at_risk" | "off_track" | "closed";

export interface Project {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  sponsor?: string;
  projectManager?: string;
  method: ProjectMethod;
  criticality: Criticality;
  status: ProjectStatus;
  targetDate?: IsoDateTime;
  forecastDate?: IsoDateTime;
  currentStageId?: EntityId;
  /** Un projet peut porter plusieurs objectifs (§9.1) — chacun est une
   * entité Objective indépendante, cf. plus bas. */
  objectiveIds: EntityId[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  lastReviewedAt?: IsoDateTime;
}

// ===========================================================================
// Objective — entité indépendante (corrigé le 20/09/2026 : la fusion dans
// Project bloquait objectifs multiples, ownership et statut propres,
// traçabilité). Identité stable, cycle de vie minimal : ne pas
// sur-concevoir, le cahier ne lui donne pas de liste de champs dédiée.
// ===========================================================================

export type ObjectiveStatus = "active" | "achieved" | "abandoned";

export interface Objective {
  id: EntityId;
  projectId: EntityId;
  statement: string;
  expectedValue?: string;
  ownerId?: EntityId;
  status: ObjectiveStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ===========================================================================
// Stage (phase/cycle) — référencé par Project.currentStageId, Milestone,
// WorkItem. Champs minimaux : la génération automatique de phases par pack
// (prédictif/agile/hybride/RUN) est le Lot 5, pas ce lot.
// ===========================================================================

export type StageStatus = "not_started" | "active" | "done";

export interface Stage {
  id: EntityId;
  projectId: EntityId;
  name: string;
  order: number;
  status: StageStatus;
  createdAt: IsoDateTime;
}

// ===========================================================================
// WorkItem — réduit aux 5 types d'exécution (audit ci-dessus) ; decision/
// risk/milestone sont des entités dédiées plus bas.
// ===========================================================================

export type WorkItemType = "task" | "request" | "incident" | "maintenance" | "deliverable";

export type WorkItemStatus = "to_scope" | "ready" | "in_progress" | "blocked" | "validation" | "done" | "cancelled" | "waiting_external";

export type WorkItemPriority = "high" | "normal" | "low";

export interface AcceptanceCriterion {
  description: string;
  satisfied: boolean;
}

export interface WorkItem {
  id: EntityId;
  projectId: EntityId;
  type: WorkItemType;
  title: string;
  responsibleId?: EntityId;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueDate?: IsoDateTime;
  exitCondition?: string;
  expectedResult?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  dependencyIds: EntityId[];
  milestoneId?: EntityId;
  evidenceIds: EntityId[];
  blockedReason?: string;
  blockedNextStep?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ===========================================================================
// Decision
// ===========================================================================

export type DecisionStatus = "to_prepare" | "ready" | "decided" | "applied" | "verified";

export interface DecisionOption {
  label: string;
  description?: string;
}

export interface Decision {
  id: EntityId;
  projectId: EntityId;
  question: string;
  context: string;
  options: DecisionOption[];
  recommendation?: string;
  criteria?: string;
  deciderId?: EntityId;
  dueDate?: IsoDateTime;
  status: DecisionStatus;
  outcome?: string;
  impactedMilestoneIds: EntityId[];
  reviewConditions?: string;
  evidenceIds: EntityId[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  decidedAt?: IsoDateTime;
  appliedAt?: IsoDateTime;
  verifiedAt?: IsoDateTime;
}

// ===========================================================================
// Risk / Issue
// ===========================================================================

export type RiskStatus = "identified" | "qualified" | "response_planned" | "under_control" | "closed";

export type RiskProbability = "low" | "medium" | "high";
export type RiskImpact = "low" | "medium" | "high";

export type RiskResponseStrategy = "avoid" | "reduce" | "transfer" | "accept";

export interface Risk {
  id: EntityId;
  projectId: EntityId;
  event: string;
  cause?: string;
  consequence?: string;
  probability?: RiskProbability;
  impact?: RiskImpact;
  /** Dérivée de probability × impact par qualifyRisk — jamais posée à la main. */
  criticality?: Criticality;
  strategy?: RiskResponseStrategy;
  response?: string;
  ownerId?: EntityId;
  trigger?: string;
  reviewDate?: IsoDateTime;
  residualRisk?: string;
  status: RiskStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type IssueStatus = "open" | "in_progress" | "resolved" | "escalated";

export interface Issue {
  id: EntityId;
  projectId: EntityId;
  /** Présent quand l'Issue provient de la matérialisation d'un Risk (§9.3). */
  originRiskId?: EntityId;
  problem: string;
  actualImpact?: string;
  blockedEntityId?: EntityId;
  resolverId?: EntityId;
  correctiveAction?: string;
  targetDate?: IsoDateTime;
  escalated: boolean;
  status: IssueStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
}

// ===========================================================================
// Milestone
// ===========================================================================

export type MilestoneStatus = "planned" | "ready_for_review" | "accepted" | "refused";

export interface Milestone {
  id: EntityId;
  projectId: EntityId;
  stageId?: EntityId;
  observableResult: string;
  targetDate: IsoDateTime;
  forecastDate?: IsoDateTime;
  dependencyIds: EntityId[];
  acceptanceCriteria: AcceptanceCriterion[];
  approverId?: EntityId;
  evidenceIds: EntityId[];
  status: MilestoneStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  reviewedAt?: IsoDateTime;
}

// ===========================================================================
// Dependency — identité propre nécessaire : son état (confirmée/en retard)
// mute dans le temps indépendamment des deux entités qu'elle relie.
// ===========================================================================

export type DependencyType = "blocks" | "requires" | "relates_to";

export type DependencyStatus = "pending" | "confirmed" | "delayed" | "resolved";

export interface Dependency {
  id: EntityId;
  projectId: EntityId;
  sourceEntityId: EntityId;
  dependentEntityId: EntityId;
  type: DependencyType;
  /** Obligatoire (DEP-001, §11.5) : createDependency le refuse sinon.
   * Aucun état métier ne permet ensuite son absence — le domaine doit être
   * au moins aussi strict que la persistance (colonne NOT NULL). */
  responsibleId: EntityId;
  neededByDate?: IsoDateTime;
  status: DependencyStatus;
  delayImpact?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ===========================================================================
// ChangeRequest
// ===========================================================================

export type ChangeRequestStatus = "submitted" | "under_analysis" | "decided" | "applied" | "rejected";

export interface ImpactAssessment {
  scope?: string;
  schedule?: string;
  cost?: string;
  quality?: string;
  risk?: string;
}

export interface ChangeRequest {
  id: EntityId;
  projectId: EntityId;
  request: string;
  origin: string;
  justification?: string;
  impact: ImpactAssessment;
  options: DecisionOption[];
  recommendation?: string;
  deciderId?: EntityId;
  status: ChangeRequestStatus;
  linkedDecisionId?: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ===========================================================================
// Evidence — entité simple : identité stable requise pour compter/tracer
// les preuves (ex. "4 livrables acceptés sur 5", §13.2), mutation limitée
// au statut de validation.
// ===========================================================================

export type EvidenceType = "document" | "link" | "screenshot" | "approval" | "other";

export type EvidenceValidationStatus = "pending" | "validated" | "rejected";

export interface Evidence {
  id: EntityId;
  projectId: EntityId;
  /** Entité prouvée (WorkItem, Decision, Milestone...) — référence libre,
   * le domaine V3 ne connaît pas de type d'entité "polymorphe" au sens
   * strict : c'est à l'appelant de garantir la cohérence du couple
   * (provedEntityType, provedEntityId). */
  provedEntityType: "work_item" | "decision" | "milestone" | "change_request";
  provedEntityId: EntityId;
  type: EvidenceType;
  description: string;
  source?: string;
  authorId?: EntityId;
  validationStatus: EvidenceValidationStatus;
  createdAt: IsoDateTime;
}
