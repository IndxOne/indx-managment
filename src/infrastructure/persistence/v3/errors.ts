/**
 * Erreurs d'infrastructure (persistance/autorisation), distinctes des
 * DomainError du domaine pur (cahier §16.2) : une erreur PostgREST ne doit
 * jamais être déguisée en erreur métier, ni remonter telle quelle (le
 * domaine ne connaît pas PostgrestError, cf. src/domain/v3).
 */

export type PersistenceError =
  | { kind: "persistence"; code: "not_found" | "stale_write" | "constraint_violation" | "unknown"; message: string }
  | { kind: "authorization"; message: string };

export type PersistenceResult<T> = { ok: true; value: T } | { ok: false; error: PersistenceError };

export function okResult<T>(value: T): PersistenceResult<T> {
  return { ok: true, value };
}

export function failResult<T>(error: PersistenceError): PersistenceResult<T> {
  return { ok: false, error };
}

interface PostgrestLikeError {
  code?: string | null;
  message: string;
}

/** Traduit une erreur PostgREST/Postgres brute en erreur d'infrastructure
 * typée. 42501 = violation RLS (autorisation) ; 23503/23505 = violation
 * d'intégrité référentielle/unicité. */
export function fromPostgrestError(error: PostgrestLikeError): PersistenceError {
  if (error.code === "42501") {
    return { kind: "authorization", message: error.message };
  }
  if (error.code === "23503" || error.code === "23505") {
    return { kind: "persistence", code: "constraint_violation", message: error.message };
  }
  return { kind: "persistence", code: "unknown", message: error.message };
}
