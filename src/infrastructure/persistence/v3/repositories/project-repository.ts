import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "../../../../domain/v3/types";
import { projectFromRow, projectToRow, type ProjectRow } from "../mappers/project";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_projects";
const OBJECTIVES_TABLE = "projets_v3_objectives";

async function objectiveIdsOf(client: SupabaseClient, projectId: string): Promise<PersistenceResult<string[]>> {
  const { data, error } = await client.from(OBJECTIVES_TABLE).select("id").eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => (row as { id: string }).id));
}

export async function createProjectRow(client: SupabaseClient, project: Project): Promise<PersistenceResult<Project>> {
  const { data, error } = await client.from(TABLE).insert(projectToRow(project)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(projectFromRow(data as ProjectRow, []));
}

export async function findProjectById(client: SupabaseClient, id: string): Promise<PersistenceResult<Project | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  const objectiveIds = await objectiveIdsOf(client, id);
  if (!objectiveIds.ok) return objectiveIds;
  return okResult(projectFromRow(data as ProjectRow, objectiveIds.value));
}

export async function updateProjectRow(
  client: SupabaseClient,
  project: Project,
  previousUpdatedAt: string
): Promise<PersistenceResult<Project>> {
  const row = projectToRow(project);
  const result = await updateWithOptimisticConcurrency<ProjectRow>(client, TABLE, project.id, previousUpdatedAt, row);
  if (!result.ok) return result;
  const objectiveIds = await objectiveIdsOf(client, project.id);
  if (!objectiveIds.ok) return objectiveIds;
  return okResult(projectFromRow(result.value, objectiveIds.value));
}
