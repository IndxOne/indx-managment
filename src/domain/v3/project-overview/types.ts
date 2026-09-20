/**
 * Projet V3 — écran de contexte (Lot 4, gate validée) : projection de
 * lecture pure dérivée du domaine V3 et de Mon Brief (Lot 3). Jamais une
 * nouvelle source de vérité : `needsAttention`/`reason` viennent
 * exclusivement de buildBrief() (Lot 2), jamais recalculés ici.
 */

import type { Criticality, EntityId, IsoDateTime, ObjectiveStatus, ProjectMethod, ProjectStatus } from "../types";

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
  nextMilestone?: { id: EntityId; observableResult: string; targetDate: IsoDateTime };
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
}
