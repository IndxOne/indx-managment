import type { ChangeRequest, ImpactAssessment, DecisionOption } from "../../../../domain/v3/types";

export interface ChangeRequestRow {
  id: string;
  project_id: string;
  workspace_id: string;
  request: string;
  origin: string;
  justification: string | null;
  impact: ImpactAssessment;
  options: DecisionOption[];
  recommendation: string | null;
  decider_id: string | null;
  status: string;
  linked_decision_id: string | null;
  created_at: string;
  updated_at: string;
}

export function changeRequestFromRow(row: ChangeRequestRow): ChangeRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    request: row.request,
    origin: row.origin,
    justification: row.justification ?? undefined,
    impact: row.impact ?? {},
    options: row.options ?? [],
    recommendation: row.recommendation ?? undefined,
    deciderId: row.decider_id ?? undefined,
    status: row.status as ChangeRequest["status"],
    linkedDecisionId: row.linked_decision_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function changeRequestToRow(changeRequest: ChangeRequest, workspaceId: string): ChangeRequestRow {
  return {
    id: changeRequest.id,
    project_id: changeRequest.projectId,
    workspace_id: workspaceId,
    request: changeRequest.request,
    origin: changeRequest.origin,
    justification: changeRequest.justification ?? null,
    impact: changeRequest.impact,
    options: changeRequest.options,
    recommendation: changeRequest.recommendation ?? null,
    decider_id: changeRequest.deciderId ?? null,
    status: changeRequest.status,
    linked_decision_id: changeRequest.linkedDecisionId ?? null,
    created_at: changeRequest.createdAt,
    updated_at: changeRequest.updatedAt,
  };
}
