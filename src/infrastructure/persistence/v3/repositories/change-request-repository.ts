import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChangeRequest } from "../../../../domain/v3/types";
import { changeRequestFromRow, changeRequestToRow, type ChangeRequestRow } from "../mappers/change-request";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_change_requests";

export async function createChangeRequestRow(
  client: SupabaseClient,
  changeRequest: ChangeRequest,
  workspaceId: string
): Promise<PersistenceResult<ChangeRequest>> {
  const { data, error } = await client.from(TABLE).insert(changeRequestToRow(changeRequest, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(changeRequestFromRow(data as ChangeRequestRow));
}

export async function findChangeRequestById(client: SupabaseClient, id: string): Promise<PersistenceResult<ChangeRequest | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? changeRequestFromRow(data as ChangeRequestRow) : null);
}

export async function updateChangeRequestRow(
  client: SupabaseClient,
  changeRequest: ChangeRequest,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<ChangeRequest>> {
  const result = await updateWithOptimisticConcurrency<ChangeRequestRow>(
    client,
    TABLE,
    changeRequest.id,
    previousUpdatedAt,
    changeRequestToRow(changeRequest, workspaceId)
  );
  if (!result.ok) return result;
  return okResult(changeRequestFromRow(result.value));
}
