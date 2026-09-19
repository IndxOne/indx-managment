import type { ChangeRequest, ImpactAssessment, DecisionOption, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionChangeRequest } from "../state-machines";

export interface CreateChangeRequestInput {
  id: EntityId;
  projectId: EntityId;
  request: string;
  origin: string;
  now: IsoDateTime;
  justification?: string;
}

export function createChangeRequest(input: CreateChangeRequestInput): CommandResult<ChangeRequest> {
  const changeRequest: ChangeRequest = {
    id: input.id,
    projectId: input.projectId,
    request: input.request,
    origin: input.origin,
    justification: input.justification,
    impact: {},
    options: [],
    status: "submitted",
    createdAt: input.now,
    updatedAt: input.now,
  };
  const events: DomainEvent[] = [
    { type: "change.requested", occurredAt: input.now, projectId: changeRequest.projectId, payload: { changeRequestId: changeRequest.id } },
  ];
  return ok(changeRequest, events);
}

/** CHG-001 (§11.5) — prédicat pur partagé avec le moteur de règles (Lot 2). */
export function hasImpactAnalysis(impact: ImpactAssessment): boolean {
  return Boolean(impact.scope || impact.schedule || impact.cost || impact.quality || impact.risk);
}

/** CHG-001 (§11.5) au niveau structurel : une modification de périmètre
 * sans analyse d'impact ne peut pas passer en analyse puis décision. */
export function submitChangeRequestForAnalysis(
  changeRequest: ChangeRequest,
  impact: ImpactAssessment,
  options: DecisionOption[],
  now: IsoDateTime
): CommandResult<ChangeRequest> {
  if (!canTransitionChangeRequest(changeRequest.status, "under_analysis")) {
    return fail(domainError("change_request_invalid_transition", `Transition ${changeRequest.status} -> under_analysis interdite`, changeRequest.id));
  }
  if (!hasImpactAnalysis(impact)) {
    return fail(domainError("change_request_missing_impact_analysis", "Une analyse d'impact est requise avant approbation", changeRequest.id));
  }
  return ok({ ...changeRequest, impact, options, status: "under_analysis", updatedAt: now }, []);
}

export function decideChangeRequest(
  changeRequest: ChangeRequest,
  decisionId: EntityId,
  outcome: "applied" | "rejected",
  now: IsoDateTime
): CommandResult<ChangeRequest> {
  if (!canTransitionChangeRequest(changeRequest.status, "decided")) {
    return fail(domainError("change_request_invalid_transition", `Transition ${changeRequest.status} -> decided interdite`, changeRequest.id));
  }
  if (!canTransitionChangeRequest("decided", outcome)) {
    return fail(domainError("change_request_invalid_transition", `Transition decided -> ${outcome} interdite`, changeRequest.id));
  }
  const next: ChangeRequest = { ...changeRequest, linkedDecisionId: decisionId, status: outcome, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "change.decided", occurredAt: now, projectId: changeRequest.projectId, payload: { changeRequestId: changeRequest.id, decisionId } },
  ];
  return ok(next, events);
}
