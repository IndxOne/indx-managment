import type { SupabaseClient } from "@supabase/supabase-js";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "./errors";

/**
 * Concurrence optimiste minimale (§15 du cahier persistance) : un UPDATE
 * dont la clause WHERE porte à la fois sur l'id et sur updated_at ne peut
 * affecter aucune ligne si un autre writer est passé entre-temps — c'est le
 * seul signal disponible côté client (PostgREST ne distingue pas "ligne
 * absente" de "updated_at obsolète"), d'où l'erreur `stale_write` générique
 * plutôt qu'un `not_found` qui serait trompeur.
 *
 * Volontairement une fonction, pas une classe/repository générique : chaque
 * repository l'appelle avec sa propre table et son propre mapper.
 */
export async function updateWithOptimisticConcurrency<TRow extends object>(
  client: SupabaseClient,
  table: string,
  id: string,
  previousUpdatedAt: string,
  patch: TRow
): Promise<PersistenceResult<TRow>> {
  const { data, error } = await client
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq("updated_at", previousUpdatedAt)
    .select()
    .maybeSingle();

  if (error) {
    return failResult(fromPostgrestError(error));
  }
  if (!data) {
    return failResult({
      kind: "persistence",
      code: "stale_write",
      message: `Écriture concurrente détectée sur ${table} (id=${id}) : updated_at ne correspond plus à la version lue.`,
    });
  }
  return okResult(data as TRow);
}
