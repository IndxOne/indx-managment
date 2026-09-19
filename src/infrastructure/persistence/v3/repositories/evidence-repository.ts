import type { SupabaseClient } from "@supabase/supabase-js";
import type { Evidence, EntityId } from "../../../../domain/v3/types";
import { evidenceFromRow, evidenceToRow, type EvidenceRow } from "../mappers/evidence";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const TABLE = "projets_v3_evidence";

export async function createEvidenceRow(
  client: SupabaseClient,
  evidence: Evidence,
  workspaceId: string
): Promise<PersistenceResult<Evidence>> {
  const { data, error } = await client.from(TABLE).insert(evidenceToRow(evidence, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(evidenceFromRow(data as EvidenceRow));
}

export async function findEvidenceById(client: SupabaseClient, id: string): Promise<PersistenceResult<Evidence | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? evidenceFromRow(data as EvidenceRow) : null);
}

/** evidenceIds d'une entité prouvée = les Evidence dont provedEntityId (+
 * provedEntityType) correspondent — reconstruit à la lecture. */
export async function listEvidenceByProvedEntity(
  client: SupabaseClient,
  provedEntityType: Evidence["provedEntityType"],
  provedEntityId: EntityId
): Promise<PersistenceResult<Evidence[]>> {
  const { data, error } = await client
    .from(TABLE)
    .select()
    .eq("proved_entity_type", provedEntityType)
    .eq("proved_entity_id", provedEntityId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => evidenceFromRow(row as EvidenceRow)));
}

/** Pas de concurrence optimiste (Evidence n'a pas d'updated_at côté
 * domaine, cf. rapport de gate) : mise à jour directe de validationStatus. */
export async function updateEvidenceValidationStatus(
  client: SupabaseClient,
  id: string,
  validationStatus: Evidence["validationStatus"]
): Promise<PersistenceResult<Evidence>> {
  const { data, error } = await client
    .from(TABLE)
    .update({ validation_status: validationStatus })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return failResult({ kind: "persistence", code: "not_found", message: `Evidence ${id} introuvable` });
  return okResult(evidenceFromRow(data as EvidenceRow));
}
