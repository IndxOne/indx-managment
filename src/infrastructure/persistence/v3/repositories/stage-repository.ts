import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "../../../../domain/v3/types";
import { stageFromRow, stageToRow, type StageRow } from "../mappers/stage";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const TABLE = "projets_v3_stages";

/** Pas d'update : aucune commande métier ne mute Stage aujourd'hui (cf.
 * rapport de gate — limitation connue du domaine actuel, non corrigée
 * préventivement). Seule la création est nécessaire. */
export async function createStageRow(client: SupabaseClient, stage: Stage, workspaceId: string): Promise<PersistenceResult<Stage>> {
  const { data, error } = await client.from(TABLE).insert(stageToRow(stage, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(stageFromRow(data as StageRow));
}

export async function findStageById(client: SupabaseClient, id: string): Promise<PersistenceResult<Stage | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? stageFromRow(data as StageRow) : null);
}
