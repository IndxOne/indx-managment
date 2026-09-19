import type { SupabaseClient } from "@supabase/supabase-js";
import type { Risk } from "../../../../domain/v3/types";
import { riskFromRow, riskToRow, type RiskRow } from "../mappers/risk";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_risks";

export async function createRiskRow(client: SupabaseClient, risk: Risk, workspaceId: string): Promise<PersistenceResult<Risk>> {
  const { data, error } = await client.from(TABLE).insert(riskToRow(risk, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(riskFromRow(data as RiskRow));
}

export async function findRiskById(client: SupabaseClient, id: string): Promise<PersistenceResult<Risk | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? riskFromRow(data as RiskRow) : null);
}

export async function updateRiskRow(
  client: SupabaseClient,
  risk: Risk,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Risk>> {
  const result = await updateWithOptimisticConcurrency<RiskRow>(client, TABLE, risk.id, previousUpdatedAt, riskToRow(risk, workspaceId));
  if (!result.ok) return result;
  return okResult(riskFromRow(result.value));
}
