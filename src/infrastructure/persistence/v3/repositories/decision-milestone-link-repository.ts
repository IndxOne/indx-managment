import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId } from "../../../../domain/v3/types";
import { decisionMilestoneLinkToRow, type DecisionMilestoneLinkRow } from "../mappers/decision-milestone-link";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const TABLE = "projets_v3_decision_milestones";

export async function linkDecisionMilestone(
  client: SupabaseClient,
  decisionId: EntityId,
  milestoneId: EntityId,
  projectId: EntityId,
  workspaceId: string
): Promise<PersistenceResult<void>> {
  const { error } = await client.from(TABLE).insert(decisionMilestoneLinkToRow(decisionId, milestoneId, projectId, workspaceId));
  if (error) return failResult(fromPostgrestError(error));
  return okResult(undefined);
}

export async function unlinkDecisionMilestone(
  client: SupabaseClient,
  decisionId: EntityId,
  milestoneId: EntityId
): Promise<PersistenceResult<void>> {
  const { error } = await client.from(TABLE).delete().eq("decision_id", decisionId).eq("milestone_id", milestoneId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult(undefined);
}

export async function listMilestoneIdsByDecision(client: SupabaseClient, decisionId: EntityId): Promise<PersistenceResult<EntityId[]>> {
  const { data, error } = await client.from(TABLE).select("milestone_id").eq("decision_id", decisionId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => (row as Pick<DecisionMilestoneLinkRow, "milestone_id">).milestone_id));
}
