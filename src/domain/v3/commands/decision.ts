import type { Decision, DecisionOption, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionDecision } from "../state-machines";

export interface CreateDecisionInput {
  id: EntityId;
  projectId: EntityId;
  question: string;
  context: string;
  now: IsoDateTime;
  options?: DecisionOption[];
  recommendation?: string;
  deciderId?: EntityId;
  dueDate?: IsoDateTime;
}

export function createDecision(input: CreateDecisionInput): CommandResult<Decision> {
  const decision: Decision = {
    id: input.id,
    projectId: input.projectId,
    question: input.question,
    context: input.context,
    options: input.options ?? [],
    recommendation: input.recommendation,
    deciderId: input.deciderId,
    dueDate: input.dueDate,
    status: "to_prepare",
    impactedMilestoneIds: [],
    evidenceIds: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(decision, []);
}

/** DEC-001 (§11.5) — prédicat pur partagé avec le moteur de règles (Lot 2). */
export function hasDecider(decision: Decision): boolean {
  return Boolean(decision.deciderId);
}

/** DEC-002 (§11.5) — idem, partagé avec le moteur de règles. */
export function hasDueDate(decision: Decision): boolean {
  return Boolean(decision.dueDate);
}

/** DEC-001 (§11.5) au niveau structurel : une décision sans décideur ne
 * peut pas devenir "prête à décider" — empêche sa publication en
 * gouvernance, comme l'exige le cahier. */
export function markDecisionReady(decision: Decision, now: IsoDateTime): CommandResult<Decision> {
  if (!canTransitionDecision(decision.status, "ready")) {
    return fail(domainError("decision_invalid_transition", `Transition ${decision.status} -> ready interdite`, decision.id));
  }
  if (!hasDecider(decision)) {
    return fail(domainError("decision_missing_decider", "Un décideur est requis avant de publier la décision", decision.id));
  }
  if (!hasDueDate(decision)) {
    return fail(domainError("decision_missing_due_date", "Une échéance est requise avant de publier la décision", decision.id));
  }
  const next: Decision = { ...decision, status: "ready", updatedAt: now };
  const events: DomainEvent[] = [
    { type: "decision.requested", occurredAt: now, projectId: decision.projectId, payload: { decisionId: decision.id } },
  ];
  return ok(next, events);
}

export function recordDecision(decision: Decision, outcome: string, now: IsoDateTime): CommandResult<Decision> {
  if (!canTransitionDecision(decision.status, "decided")) {
    return fail(domainError("decision_invalid_transition", `Transition ${decision.status} -> decided interdite`, decision.id));
  }
  const next: Decision = { ...decision, status: "decided", outcome, decidedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "decision.recorded", occurredAt: now, projectId: decision.projectId, payload: { decisionId: decision.id, outcome } },
  ];
  return ok(next, events);
}

export function applyDecision(decision: Decision, now: IsoDateTime): CommandResult<Decision> {
  if (!canTransitionDecision(decision.status, "applied")) {
    return fail(domainError("decision_invalid_transition", `Transition ${decision.status} -> applied interdite`, decision.id));
  }
  const next: Decision = { ...decision, status: "applied", appliedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "decision.applied", occurredAt: now, projectId: decision.projectId, payload: { decisionId: decision.id } },
  ];
  return ok(next, events);
}

export function verifyDecision(decision: Decision, now: IsoDateTime): CommandResult<Decision> {
  if (!canTransitionDecision(decision.status, "verified")) {
    return fail(domainError("decision_invalid_transition", `Transition ${decision.status} -> verified interdite`, decision.id));
  }
  const next: Decision = { ...decision, status: "verified", verifiedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "decision.verified", occurredAt: now, projectId: decision.projectId, payload: { decisionId: decision.id } },
  ];
  return ok(next, events);
}
