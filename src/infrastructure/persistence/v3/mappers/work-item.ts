import type { WorkItem, AcceptanceCriterion, EntityId } from "../../../../domain/v3/types";

export interface WorkItemRow {
  id: string;
  project_id: string;
  workspace_id: string;
  type: string;
  title: string;
  responsible_id: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  exit_condition: string | null;
  expected_result: string | null;
  acceptance_criteria: AcceptanceCriterion[];
  milestone_id: string | null;
  blocked_reason: string | null;
  blocked_next_step: string | null;
  created_at: string;
  updated_at: string;
}

export function workItemFromRow(row: WorkItemRow, dependencyIds: EntityId[], evidenceIds: EntityId[]): WorkItem {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as WorkItem["type"],
    title: row.title,
    responsibleId: row.responsible_id ?? undefined,
    status: row.status as WorkItem["status"],
    priority: row.priority as WorkItem["priority"],
    dueDate: row.due_date ?? undefined,
    exitCondition: row.exit_condition ?? undefined,
    expectedResult: row.expected_result ?? undefined,
    acceptanceCriteria: row.acceptance_criteria ?? [],
    dependencyIds,
    milestoneId: row.milestone_id ?? undefined,
    evidenceIds,
    blockedReason: row.blocked_reason ?? undefined,
    blockedNextStep: row.blocked_next_step ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workItemToRow(item: WorkItem, workspaceId: string): WorkItemRow {
  return {
    id: item.id,
    project_id: item.projectId,
    workspace_id: workspaceId,
    type: item.type,
    title: item.title,
    responsible_id: item.responsibleId ?? null,
    status: item.status,
    priority: item.priority,
    due_date: item.dueDate ?? null,
    exit_condition: item.exitCondition ?? null,
    expected_result: item.expectedResult ?? null,
    acceptance_criteria: item.acceptanceCriteria,
    milestone_id: item.milestoneId ?? null,
    blocked_reason: item.blockedReason ?? null,
    blocked_next_step: item.blockedNextStep ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}
