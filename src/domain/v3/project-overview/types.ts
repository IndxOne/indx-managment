/**
 * Projet V3 — écran de contexte (Lot 4, gate validée) : projection de
 * lecture pure dérivée du domaine V3 et de Mon Brief (Lot 3). Jamais une
 * nouvelle source de vérité : `needsAttention`/`reason` viennent
 * exclusivement de buildBrief() (Lot 2), jamais recalculés ici.
 */

import type { Criticality, EntityId, IsoDateTime, MilestoneStatus, ObjectiveStatus, ProjectMethod, ProjectStatus } from "../types";
import type { BriefItem, BriefSourceType } from "../brief/types";

/** UX-5.3 ("Changé récemment") : mêmes types que Mon Brief, plus Objective
 * (jamais couvert par Mon Brief, mais explicitement demandé ici). */
export type RecentChangeSourceType = BriefSourceType | "objective";

export interface RecentChangeItem {
  id: EntityId;
  sourceType: RecentChangeSourceType;
  title: string;
  updatedAt: IsoDateTime;
}

export interface ObjectiveOverviewItem {
  id: EntityId;
  statement: string;
  expectedValue?: string;
  status: ObjectiveStatus;
  hasOwner: boolean;
}

export interface MilestoneOverviewItem {
  id: EntityId;
  observableResult: string;
  status: string;
  targetDate: IsoDateTime;
  needsAttention: boolean;
  reason?: string;
}

export interface WorkItemOverviewItem {
  id: EntityId;
  title: string;
  status: string;
  priority: string;
  dueDate?: IsoDateTime;
  needsAttention: boolean;
  reason?: string;
}

export interface DecisionOverviewItem {
  id: EntityId;
  question: string;
  status: string;
  dueDate?: IsoDateTime;
  hasDecider: boolean;
  needsAttention: boolean;
  reason?: string;
}

export interface RiskOverviewItem {
  id: EntityId;
  event: string;
  criticality?: Criticality;
  status: string;
  hasOwner: boolean;
  needsAttention: boolean;
  reason?: string;
}

export interface IssueOverviewItem {
  id: EntityId;
  problem: string;
  status: string;
  targetDate?: IsoDateTime;
  hasResolver: boolean;
  needsAttention: boolean;
  reason?: string;
}

export interface ProjectOverviewSummary {
  activeObjectivesCount: number;
  openWorkItemsCount: number;
  highCriticalRisksCount: number;
  pendingDecisionsCount: number;
  openIssuesCount: number;
  nextMilestone?: { id: EntityId; observableResult: string; targetDate: IsoDateTime; status?: MilestoneStatus };
}

export interface ProjectOverviewProjection {
  project: {
    id: EntityId;
    name: string;
    status: ProjectStatus;
    method: ProjectMethod;
    criticality: Criticality;
    sponsor?: string;
    projectManager?: string;
    targetDate?: IsoDateTime;
    forecastDate?: IsoDateTime;
  };
  objectives: ObjectiveOverviewItem[];
  milestones: MilestoneOverviewItem[];
  workItems: WorkItemOverviewItem[];
  decisions: DecisionOverviewItem[];
  risks: RiskOverviewItem[];
  issues: IssueOverviewItem[];
  summary: ProjectOverviewSummary;
  /** UX-5.1 (Focus maintenant) — élément le plus prioritaire de Mon Brief
   * pour ce projet, réutilisé tel quel : buildBrief() est déjà appelé par
   * buildProjectOverview(), aucun recalcul ni nouvelle requête. undefined
   * si aucun élément ne demande attention (projet calme). */
  focusItem?: BriefItem;
  /** UX-5.2 (À surveiller) — jusqu'à 3 éléments suivants de
   * `brief.attentionItems`, dans le même ordre de priorité, focusItem
   * exclu. Même source que focusItem : aucun recalcul, aucune nouvelle
   * requête. Tableau vide si rien d'autre ne demande attention. */
  watchItems: BriefItem[];
  /** UX-5.3 (Changé récemment) — jusqu'à 5 entités dont `updatedAt` diffère
   * de `createdAt`, triées par `updatedAt` décroissant (tie-break id). Bloc
   * informatif, jamais prioritaire : n'affecte ni focusItem ni watchItems.
   * Dependency/ChangeRequest différés (pas de catégorie Explorer pour eux). */
  recentChanges: RecentChangeItem[];
}
