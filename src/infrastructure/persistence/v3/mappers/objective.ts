import type { Objective } from "../../../../domain/v3/types";

export interface ObjectiveRow {
  id: string;
  project_id: string;
  workspace_id: string;
  statement: string;
  expected_value: string | null;
  owner_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function objectiveFromRow(row: ObjectiveRow): Objective {
  return {
    id: row.id,
    projectId: row.project_id,
    statement: row.statement,
    expectedValue: row.expected_value ?? undefined,
    ownerId: row.owner_id ?? undefined,
    status: row.status as Objective["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function objectiveToRow(objective: Objective, workspaceId: string): ObjectiveRow {
  return {
    id: objective.id,
    project_id: objective.projectId,
    workspace_id: workspaceId,
    statement: objective.statement,
    expected_value: objective.expectedValue ?? null,
    owner_id: objective.ownerId ?? null,
    status: objective.status,
    created_at: objective.createdAt,
    updated_at: objective.updatedAt,
  };
}
