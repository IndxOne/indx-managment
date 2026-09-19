import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dependency, EntityId } from "../../../../domain/v3/types";
import { dependencyFromRow, dependencyToRow, type DependencyRow } from "../mappers/dependency";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_dependencies";

export async function createDependencyRow(
  client: SupabaseClient,
  dependency: Dependency,
  workspaceId: string
): Promise<PersistenceResult<Dependency>> {
  const { data, error } = await client.from(TABLE).insert(dependencyToRow(dependency, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(dependencyFromRow(data as DependencyRow));
}

export async function findDependencyById(client: SupabaseClient, id: string): Promise<PersistenceResult<Dependency | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? dependencyFromRow(data as DependencyRow) : null);
}

/** dependencyIds d'une entité (WorkItem/Milestone) = les Dependency dont
 * elle est le côté "dependent" (l'entité qui attend quelque chose), cf.
 * rapport de gate persistance : reconstruit à la lecture, jamais dupliqué
 * en colonne uuid[]. */
export async function listDependenciesByDependentEntity(
  client: SupabaseClient,
  dependentEntityId: EntityId
): Promise<PersistenceResult<Dependency[]>> {
  const { data, error } = await client.from(TABLE).select().eq("dependent_entity_id", dependentEntityId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => dependencyFromRow(row as DependencyRow)));
}

export async function updateDependencyRow(
  client: SupabaseClient,
  dependency: Dependency,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Dependency>> {
  const result = await updateWithOptimisticConcurrency<DependencyRow>(
    client,
    TABLE,
    dependency.id,
    previousUpdatedAt,
    dependencyToRow(dependency, workspaceId)
  );
  if (!result.ok) return result;
  return okResult(dependencyFromRow(result.value));
}
