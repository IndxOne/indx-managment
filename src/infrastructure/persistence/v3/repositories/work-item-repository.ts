import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkItem } from "../../../../domain/v3/types";
import { workItemFromRow, workItemToRow, type WorkItemRow } from "../mappers/work-item";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";
import { listDependenciesByDependentEntity } from "./dependency-repository";
import { listEvidenceByProvedEntity } from "./evidence-repository";

const TABLE = "projets_v3_work_items";

async function hydrate(client: SupabaseClient, row: WorkItemRow): Promise<PersistenceResult<WorkItem>> {
  const dependencies = await listDependenciesByDependentEntity(client, row.id);
  if (!dependencies.ok) return dependencies;
  const evidence = await listEvidenceByProvedEntity(client, "work_item", row.id);
  if (!evidence.ok) return evidence;
  return okResult(workItemFromRow(row, dependencies.value.map((d) => d.id), evidence.value.map((e) => e.id)));
}

export async function createWorkItemRow(
  client: SupabaseClient,
  item: WorkItem,
  workspaceId: string
): Promise<PersistenceResult<WorkItem>> {
  const { data, error } = await client.from(TABLE).insert(workItemToRow(item, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(workItemFromRow(data as WorkItemRow, [], []));
}

export async function findWorkItemById(client: SupabaseClient, id: string): Promise<PersistenceResult<WorkItem | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  return hydrate(client, data as WorkItemRow);
}

export async function updateWorkItemRow(
  client: SupabaseClient,
  item: WorkItem,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<WorkItem>> {
  const result = await updateWithOptimisticConcurrency<WorkItemRow>(
    client,
    TABLE,
    item.id,
    previousUpdatedAt,
    workItemToRow(item, workspaceId)
  );
  if (!result.ok) return result;
  return hydrate(client, result.value);
}
