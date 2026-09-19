import type { Project, EntityId } from "../../../../domain/v3/types";

/**
 * objectiveIds n'est PAS une colonne (décision gate persistance §4) :
 * reconstruit par le repository depuis projets_v3_objectives.project_id et
 * injecté ici en paramètre, jamais lu depuis la ligne elle-même.
 */
export interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  sponsor: string | null;
  project_manager: string | null;
  method: string;
  criticality: string;
  status: string;
  target_date: string | null;
  forecast_date: string | null;
  current_stage_id: string | null;
  created_at: string;
  updated_at: string;
  last_reviewed_at: string | null;
}

export function projectFromRow(row: ProjectRow, objectiveIds: EntityId[]): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    sponsor: row.sponsor ?? undefined,
    projectManager: row.project_manager ?? undefined,
    method: row.method as Project["method"],
    criticality: row.criticality as Project["criticality"],
    status: row.status as Project["status"],
    targetDate: row.target_date ?? undefined,
    forecastDate: row.forecast_date ?? undefined,
    currentStageId: row.current_stage_id ?? undefined,
    objectiveIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
  };
}

export function projectToRow(project: Project): ProjectRow {
  return {
    id: project.id,
    workspace_id: project.workspaceId,
    name: project.name,
    sponsor: project.sponsor ?? null,
    project_manager: project.projectManager ?? null,
    method: project.method,
    criticality: project.criticality,
    status: project.status,
    target_date: project.targetDate ?? null,
    forecast_date: project.forecastDate ?? null,
    current_stage_id: project.currentStageId ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    last_reviewed_at: project.lastReviewedAt ?? null,
  };
}
