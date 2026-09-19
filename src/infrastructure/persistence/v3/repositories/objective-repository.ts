import type { SupabaseClient } from "@supabase/supabase-js";
import type { Objective, EntityId } from "../../../../domain/v3/types";
import { objectiveFromRow, objectiveToRow, type ObjectiveRow } from "../mappers/objective";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_objectives";

export async function createObjectiveRow(
  client: SupabaseClient,
  objective: Objective,
  workspaceId: string
): Promise<PersistenceResult<Objective>> {
  const { data, error } = await client.from(TABLE).insert(objectiveToRow(objective, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(objectiveFromRow(data as ObjectiveRow));
}

export async function findObjectiveById(client: SupabaseClient, id: string): Promise<PersistenceResult<Objective | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? objectiveFromRow(data as ObjectiveRow) : null);
}

export async function listObjectivesByProject(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Objective[]>> {
  const { data, error } = await client.from(TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => objectiveFromRow(row as ObjectiveRow)));
}

export async function updateObjectiveRow(
  client: SupabaseClient,
  objective: Objective,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Objective>> {
  const result = await updateWithOptimisticConcurrency<ObjectiveRow>(
    client,
    TABLE,
    objective.id,
    previousUpdatedAt,
    objectiveToRow(objective, workspaceId)
  );
  if (!result.ok) return result;
  return okResult(objectiveFromRow(result.value));
}
