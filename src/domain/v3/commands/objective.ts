import type { Objective, EntityId, IsoDateTime } from "../types";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";

export interface CreateObjectiveInput {
  id: EntityId;
  projectId: EntityId;
  statement: string;
  now: IsoDateTime;
  expectedValue?: string;
  ownerId?: EntityId;
}

/** Aucun invariant structurel à la création — même logique que Project :
 * un objectif peut démarrer sans propriétaire, ce n'est pas au domaine de
 * l'interdire (Lot 2). */
export function createObjective(input: CreateObjectiveInput): CommandResult<Objective> {
  const objective: Objective = {
    id: input.id,
    projectId: input.projectId,
    statement: input.statement,
    expectedValue: input.expectedValue,
    ownerId: input.ownerId,
    status: "active",
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(objective, []);
}

/** Un seul point de sortie du cycle de vie (actif -> atteint/abandonné) :
 * pas de machine d'état dédiée pour rester minimal, cf. consigne "ne pas
 * sur-concevoir". Les deux états terminaux ne peuvent pas être rouverts
 * ici — créer un nouvel Objective plutôt que réanimer un ancien. */
export function closeObjective(objective: Objective, outcome: "achieved" | "abandoned", now: IsoDateTime): CommandResult<Objective> {
  if (objective.status !== "active") {
    return fail(domainError("objective_invalid_transition", `Transition ${objective.status} -> ${outcome} interdite`, objective.id));
  }
  return ok({ ...objective, status: outcome, updatedAt: now }, []);
}
