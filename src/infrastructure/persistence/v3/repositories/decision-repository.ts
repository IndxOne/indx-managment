import type { SupabaseClient } from "@supabase/supabase-js";
import type { Decision } from "../../../../domain/v3/types";
import { decisionFromRow, decisionToRow, type DecisionRow } from "../mappers/decision";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";
import { listMilestoneIdsByDecision } from "./decision-milestone-link-repository";
import { listEvidenceByProvedEntity } from "./evidence-repository";

const TABLE = "projets_v3_decisions";

async function hydrate(client: SupabaseClient, row: DecisionRow): Promise<PersistenceResult<Decision>> {
  const impactedMilestoneIds = await listMilestoneIdsByDecision(client, row.id);
  if (!impactedMilestoneIds.ok) return impactedMilestoneIds;
  const evidence = await listEvidenceByProvedEntity(client, "decision", row.id);
  if (!evidence.ok) return evidence;
  return okResult(decisionFromRow(row, impactedMilestoneIds.value, evidence.value.map((e) => e.id)));
}

export async function createDecisionRow(
  client: SupabaseClient,
  decision: Decision,
  workspaceId: string
): Promise<PersistenceResult<Decision>> {
  const { data, error } = await client.from(TABLE).insert(decisionToRow(decision, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(decisionFromRow(data as DecisionRow, [], []));
}

export async function findDecisionById(client: SupabaseClient, id: string): Promise<PersistenceResult<Decision | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  return hydrate(client, data as DecisionRow);
}

export async function updateDecisionRow(
  client: SupabaseClient,
  decision: Decision,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Decision>> {
  const result = await updateWithOptimisticConcurrency<DecisionRow>(
    client,
    TABLE,
    decision.id,
    previousUpdatedAt,
    decisionToRow(decision, workspaceId)
  );
  if (!result.ok) return result;
  return hydrate(client, result.value);
}
