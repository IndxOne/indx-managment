/**
 * Événements de domaine (cahier §16.3). Émis par les commandes, jamais par
 * les entités elles-mêmes. `occurredAt` est toujours injecté par
 * l'appelant (§16.2), jamais lu depuis `new Date()` ici.
 *
 * Portée Lot 1 : seuls les événements couvrant les commandes implémentées
 * dans ce lot sont typés ci-dessous. Les événements listés au cahier mais
 * hors périmètre (project.pack_selected — Lot 5 ; brief.item_resolved —
 * Lot 3 ; rule.executed — Lot 2) seront ajoutés par leurs lots respectifs.
 */

import type { EntityId, IsoDateTime } from "./types";

interface BaseEvent<TType extends string> {
  type: TType;
  occurredAt: IsoDateTime;
  projectId: EntityId;
}

export interface ProjectCreatedEvent extends BaseEvent<"project.created"> {
  payload: { projectId: EntityId; workspaceId: EntityId };
}

export interface WorkItemAssignedEvent extends BaseEvent<"work_item.assigned"> {
  payload: { workItemId: EntityId; responsibleId: EntityId };
}

export interface WorkItemBlockedEvent extends BaseEvent<"work_item.blocked"> {
  payload: { workItemId: EntityId; reason: string };
}

export interface WorkItemTransitionedEvent extends BaseEvent<"work_item.transitioned"> {
  payload: { workItemId: EntityId; from: string; to: string };
}

export interface DecisionRequestedEvent extends BaseEvent<"decision.requested"> {
  payload: { decisionId: EntityId };
}

export interface DecisionRecordedEvent extends BaseEvent<"decision.recorded"> {
  payload: { decisionId: EntityId; outcome: string };
}

export interface DecisionAppliedEvent extends BaseEvent<"decision.applied"> {
  payload: { decisionId: EntityId };
}

export interface DecisionVerifiedEvent extends BaseEvent<"decision.verified"> {
  payload: { decisionId: EntityId };
}

export interface RiskQualifiedEvent extends BaseEvent<"risk.qualified"> {
  payload: { riskId: EntityId; criticality: string };
}

export interface RiskResponsePlannedEvent extends BaseEvent<"risk.response_planned"> {
  payload: { riskId: EntityId };
}

export interface RiskTriggeredEvent extends BaseEvent<"risk.triggered"> {
  payload: { riskId: EntityId; issueId: EntityId };
}

export interface IssueResolvedEvent extends BaseEvent<"issue.resolved"> {
  payload: { issueId: EntityId };
}

export interface MilestoneReadyForReviewEvent extends BaseEvent<"milestone.ready_for_review"> {
  payload: { milestoneId: EntityId };
}

export interface MilestoneAcceptedEvent extends BaseEvent<"milestone.accepted"> {
  payload: { milestoneId: EntityId };
}

export interface MilestoneRefusedEvent extends BaseEvent<"milestone.refused"> {
  payload: { milestoneId: EntityId };
}

export interface MilestoneResubmittedEvent extends BaseEvent<"milestone.resubmitted"> {
  payload: { milestoneId: EntityId };
}

export interface DependencyDelayedEvent extends BaseEvent<"dependency.delayed"> {
  payload: { dependencyId: EntityId };
}

export interface DependencyConfirmedEvent extends BaseEvent<"dependency.confirmed"> {
  payload: { dependencyId: EntityId };
}

export interface ChangeRequestedEvent extends BaseEvent<"change.requested"> {
  payload: { changeRequestId: EntityId };
}

export interface ChangeDecidedEvent extends BaseEvent<"change.decided"> {
  payload: { changeRequestId: EntityId; decisionId: EntityId };
}

export interface EvidenceAttachedEvent extends BaseEvent<"evidence.attached"> {
  payload: { evidenceId: EntityId; provedEntityId: EntityId };
}

export interface EvidenceValidatedEvent extends BaseEvent<"evidence.validated"> {
  payload: { evidenceId: EntityId };
}

export type DomainEvent =
  | ProjectCreatedEvent
  | WorkItemAssignedEvent
  | WorkItemBlockedEvent
  | WorkItemTransitionedEvent
  | DecisionRequestedEvent
  | DecisionRecordedEvent
  | DecisionAppliedEvent
  | DecisionVerifiedEvent
  | RiskQualifiedEvent
  | RiskResponsePlannedEvent
  | RiskTriggeredEvent
  | IssueResolvedEvent
  | MilestoneReadyForReviewEvent
  | MilestoneAcceptedEvent
  | MilestoneRefusedEvent
  | MilestoneResubmittedEvent
  | DependencyDelayedEvent
  | DependencyConfirmedEvent
  | ChangeRequestedEvent
  | ChangeDecidedEvent
  | EvidenceAttachedEvent
  | EvidenceValidatedEvent;
