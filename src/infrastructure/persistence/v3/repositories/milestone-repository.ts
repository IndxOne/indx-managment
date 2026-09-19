import type { SupabaseClient } from "@supabase/supabase-js";
import type { Milestone } from "../../../../domain/v3/types";
import { milestoneFromRow, milestoneToRow, type MilestoneRow } from "../mappers/milestone";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";
import { listDependenciesByDependentEntity } from "./dependency-repository";
import { listEvidenceByProvedEntity } from "./evidence-repository";

const TABLE = "projets_v3_milestones";

async function hydrate(client: SupabaseClient, row: MilestoneRow): Promise<PersistenceResult<Milestone>> {
  const dependencies = await listDependenciesByDependentEntity(client, row.id);
  if (!dependencies.ok) return dependencies;
  const evidence = await listEvidenceByProvedEntity(client, "milestone", row.id);
  if (!evidence.ok) return evidence;
  return okResult(milestoneFromRow(row, dependencies.value.map((d) => d.id), evidence.value.map((e) => e.id)));
}

export async function createMilestoneRow(
  client: SupabaseClient,
  milestone: Milestone,
  workspaceId: string
): Promise<PersistenceResult<Milestone>> {
  const { data, error } = await client.from(TABLE).insert(milestoneToRow(milestone, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(milestoneFromRow(data as MilestoneRow, [], []));
}

export async function findMilestoneById(client: SupabaseClient, id: string): Promise<PersistenceResult<Milestone | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  return hydrate(client, data as MilestoneRow);
}

export async function updateMilestoneRow(
  client: SupabaseClient,
  milestone: Milestone,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Milestone>> {
  const result = await updateWithOptimisticConcurrency<MilestoneRow>(
    client,
    TABLE,
    milestone.id,
    previousUpdatedAt,
    milestoneToRow(milestone, workspaceId)
  );
  if (!result.ok) return result;
  return hydrate(client, result.value);
}
