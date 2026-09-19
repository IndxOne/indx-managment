import type { Dependency } from "../../../../domain/v3/types";

export interface DependencyRow {
  id: string;
  project_id: string;
  workspace_id: string;
  source_entity_id: string;
  dependent_entity_id: string;
  type: string;
  responsible_id: string;
  needed_by_date: string | null;
  status: string;
  delay_impact: string | null;
  created_at: string;
  updated_at: string;
}

export function dependencyFromRow(row: DependencyRow): Dependency {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceEntityId: row.source_entity_id,
    dependentEntityId: row.dependent_entity_id,
    type: row.type as Dependency["type"],
    responsibleId: row.responsible_id,
    neededByDate: row.needed_by_date ?? undefined,
    status: row.status as Dependency["status"],
    delayImpact: row.delay_impact ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dependencyToRow(dependency: Dependency, workspaceId: string): DependencyRow {
  return {
    id: dependency.id,
    project_id: dependency.projectId,
    workspace_id: workspaceId,
    source_entity_id: dependency.sourceEntityId,
    dependent_entity_id: dependency.dependentEntityId,
    type: dependency.type,
    // responsibleId est optionnel dans le type domaine mais invariant de
    // création (DEP-001, createDependency le refuse sinon) — la colonne
    // est NOT NULL, une valeur manquante ici serait un bug appelant.
    responsible_id: dependency.responsibleId as string,
    needed_by_date: dependency.neededByDate ?? null,
    status: dependency.status,
    delay_impact: dependency.delayImpact ?? null,
    created_at: dependency.createdAt,
    updated_at: dependency.updatedAt,
  };
}
