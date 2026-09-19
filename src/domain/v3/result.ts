import type { DomainError } from "./errors";
import type { DomainEvent } from "./events";

/**
 * Toute commande retourne son résultat métier ET les DomainEvents produits
 * (jamais une simple mutation d'entité) — cahier, consigne explicite.
 */
export type CommandResult<TState> =
  | { ok: true; state: TState; events: DomainEvent[] }
  | { ok: false; error: DomainError };

export function ok<TState>(state: TState, events: DomainEvent[]): CommandResult<TState> {
  return { ok: true, state, events };
}

export function fail<TState>(error: DomainError): CommandResult<TState> {
  return { ok: false, error };
}
