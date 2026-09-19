import type { Milestone, AcceptanceCriterion, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionMilestone } from "../state-machines";

export interface CreateMilestoneInput {
  id: EntityId;
  projectId: EntityId;
  observableResult: string;
  targetDate: IsoDateTime;
  now: IsoDateTime;
  stageId?: EntityId;
}

export function createMilestone(input: CreateMilestoneInput): CommandResult<Milestone> {
  const milestone: Milestone = {
    id: input.id,
    projectId: input.projectId,
    stageId: input.stageId,
    observableResult: input.observableResult,
    targetDate: input.targetDate,
    dependencyIds: [],
    acceptanceCriteria: [],
    evidenceIds: [],
    status: "planned",
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(milestone, []);
}

export function setMilestoneCriteria(milestone: Milestone, criteria: AcceptanceCriterion[], now: IsoDateTime): CommandResult<Milestone> {
  return ok({ ...milestone, acceptanceCriteria: criteria, updatedAt: now }, []);
}

/** JAL-001 (§11.5) au niveau structurel : un jalon sans critères
 * d'acceptation ne peut pas passer "prêt pour contrôle". */
export function submitMilestoneForReview(milestone: Milestone, now: IsoDateTime): CommandResult<Milestone> {
  if (!canTransitionMilestone(milestone.status, "ready_for_review")) {
    return fail(domainError("milestone_invalid_transition", `Transition ${milestone.status} -> ready_for_review interdite`, milestone.id));
  }
  if (milestone.acceptanceCriteria.length === 0) {
    return fail(domainError("milestone_missing_criteria", "Des critères d'acceptation sont requis avant contrôle", milestone.id));
  }
  const next: Milestone = { ...milestone, status: "ready_for_review", updatedAt: now };
  const events: DomainEvent[] = [
    { type: "milestone.ready_for_review", occurredAt: now, projectId: milestone.projectId, payload: { milestoneId: milestone.id } },
  ];
  return ok(next, events);
}

/** JAL-002 (§11.5) au niveau structurel : une preuve manquante empêche
 * l'acceptation. */
export function acceptMilestone(milestone: Milestone, approverId: EntityId, now: IsoDateTime): CommandResult<Milestone> {
  if (!canTransitionMilestone(milestone.status, "accepted")) {
    return fail(domainError("milestone_invalid_transition", `Transition ${milestone.status} -> accepted interdite`, milestone.id));
  }
  if (milestone.evidenceIds.length === 0) {
    return fail(domainError("milestone_missing_evidence", "Une preuve est requise avant acceptation", milestone.id));
  }
  const next: Milestone = { ...milestone, status: "accepted", approverId, reviewedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "milestone.accepted", occurredAt: now, projectId: milestone.projectId, payload: { milestoneId: milestone.id } },
  ];
  return ok(next, events);
}

export function refuseMilestone(milestone: Milestone, now: IsoDateTime): CommandResult<Milestone> {
  if (!canTransitionMilestone(milestone.status, "refused")) {
    return fail(domainError("milestone_invalid_transition", `Transition ${milestone.status} -> refused interdite`, milestone.id));
  }
  const next: Milestone = { ...milestone, status: "refused", reviewedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "milestone.refused", occurredAt: now, projectId: milestone.projectId, payload: { milestoneId: milestone.id } },
  ];
  return ok(next, events);
}
