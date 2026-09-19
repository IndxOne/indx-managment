import type { Stage } from "../../../../domain/v3/types";

/** Pas de updated_at : fidèle au type domaine actuel (limitation connue,
 * cf. rapport de gate persistance — aucune commande ne mute Stage). */
export interface StageRow {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  order: number;
  status: string;
  created_at: string;
}

export function stageFromRow(row: StageRow): Stage {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    order: row.order,
    status: row.status as Stage["status"],
    createdAt: row.created_at,
  };
}

export function stageToRow(stage: Stage, workspaceId: string): StageRow {
  return {
    id: stage.id,
    project_id: stage.projectId,
    workspace_id: workspaceId,
    name: stage.name,
    order: stage.order,
    status: stage.status,
    created_at: stage.createdAt,
  };
}
