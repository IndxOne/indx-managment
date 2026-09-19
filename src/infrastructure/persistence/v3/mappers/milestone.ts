import type { Milestone, AcceptanceCriterion, EntityId } from "../../../../domain/v3/types";

/** dependencyIds/evidenceIds ne sont pas des colonnes (décision §4) :
 * reconstruits par le repository, injectés en paramètre ici. */
export interface MilestoneRow {
  id: string;
  project_id: string;
  workspace_id: string;
  stage_id: string | null;
  observable_result: string;
  target_date: string;
  forecast_date: string | null;
  acceptance_criteria: AcceptanceCriterion[];
  approver_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export function milestoneFromRow(row: MilestoneRow, dependencyIds: EntityId[], evidenceIds: EntityId[]): Milestone {
  return {
    id: row.id,
    projectId: row.project_id,
    stageId: row.stage_id ?? undefined,
    observableResult: row.observable_result,
    targetDate: row.target_date,
    forecastDate: row.forecast_date ?? undefined,
    dependencyIds,
    acceptanceCriteria: row.acceptance_criteria ?? [],
    approverId: row.approver_id ?? undefined,
    evidenceIds,
    status: row.status as Milestone["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export function milestoneToRow(milestone: Milestone, workspaceId: string): MilestoneRow {
  return {
    id: milestone.id,
    project_id: milestone.projectId,
    workspace_id: workspaceId,
    stage_id: milestone.stageId ?? null,
    observable_result: milestone.observableResult,
    target_date: milestone.targetDate,
    forecast_date: milestone.forecastDate ?? null,
    acceptance_criteria: milestone.acceptanceCriteria,
    approver_id: milestone.approverId ?? null,
    status: milestone.status,
    created_at: milestone.createdAt,
    updated_at: milestone.updatedAt,
    reviewed_at: milestone.reviewedAt ?? null,
  };
}
