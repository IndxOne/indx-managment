import type { Decision, DecisionOption, EntityId } from "../../../../domain/v3/types";

export interface DecisionRow {
  id: string;
  project_id: string;
  workspace_id: string;
  question: string;
  context: string;
  options: DecisionOption[];
  recommendation: string | null;
  criteria: string | null;
  decider_id: string | null;
  due_date: string | null;
  status: string;
  outcome: string | null;
  review_conditions: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  applied_at: string | null;
  verified_at: string | null;
}

export function decisionFromRow(row: DecisionRow, impactedMilestoneIds: EntityId[], evidenceIds: EntityId[]): Decision {
  return {
    id: row.id,
    projectId: row.project_id,
    question: row.question,
    context: row.context,
    options: row.options ?? [],
    recommendation: row.recommendation ?? undefined,
    criteria: row.criteria ?? undefined,
    deciderId: row.decider_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    status: row.status as Decision["status"],
    outcome: row.outcome ?? undefined,
    impactedMilestoneIds,
    reviewConditions: row.review_conditions ?? undefined,
    evidenceIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedAt: row.decided_at ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
  };
}

export function decisionToRow(decision: Decision, workspaceId: string): DecisionRow {
  return {
    id: decision.id,
    project_id: decision.projectId,
    workspace_id: workspaceId,
    question: decision.question,
    context: decision.context,
    options: decision.options,
    recommendation: decision.recommendation ?? null,
    criteria: decision.criteria ?? null,
    decider_id: decision.deciderId ?? null,
    due_date: decision.dueDate ?? null,
    status: decision.status,
    outcome: decision.outcome ?? null,
    review_conditions: decision.reviewConditions ?? null,
    created_at: decision.createdAt,
    updated_at: decision.updatedAt,
    decided_at: decision.decidedAt ?? null,
    applied_at: decision.appliedAt ?? null,
    verified_at: decision.verifiedAt ?? null,
  };
}
