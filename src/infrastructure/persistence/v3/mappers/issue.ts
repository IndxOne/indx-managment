import type { Issue } from "../../../../domain/v3/types";

export interface IssueRow {
  id: string;
  project_id: string;
  workspace_id: string;
  origin_risk_id: string | null;
  problem: string;
  actual_impact: string | null;
  blocked_entity_id: string | null;
  resolver_id: string | null;
  corrective_action: string | null;
  target_date: string | null;
  escalated: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export function issueFromRow(row: IssueRow): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    originRiskId: row.origin_risk_id ?? undefined,
    problem: row.problem,
    actualImpact: row.actual_impact ?? undefined,
    blockedEntityId: row.blocked_entity_id ?? undefined,
    resolverId: row.resolver_id ?? undefined,
    correctiveAction: row.corrective_action ?? undefined,
    targetDate: row.target_date ?? undefined,
    escalated: row.escalated,
    status: row.status as Issue["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export function issueToRow(issue: Issue, workspaceId: string): IssueRow {
  return {
    id: issue.id,
    project_id: issue.projectId,
    workspace_id: workspaceId,
    origin_risk_id: issue.originRiskId ?? null,
    problem: issue.problem,
    actual_impact: issue.actualImpact ?? null,
    blocked_entity_id: issue.blockedEntityId ?? null,
    resolver_id: issue.resolverId ?? null,
    corrective_action: issue.correctiveAction ?? null,
    target_date: issue.targetDate ?? null,
    escalated: issue.escalated,
    status: issue.status,
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    resolved_at: issue.resolvedAt ?? null,
  };
}
