import type { Dependency, DependencyType, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";

export interface CreateDependencyInput {
  id: EntityId;
  projectId: EntityId;
  sourceEntityId: EntityId;
  dependentEntityId: EntityId;
  type: DependencyType;
  responsibleId: EntityId;
  now: IsoDateTime;
  neededByDate?: IsoDateTime;
}

/** DEP-001 (§11.5) suppose un responsable identifié pour toute dépendance
 * externe : posé comme invariant de création plutôt que de transition —
 * une dépendance sans responsable ne devrait jamais exister, pas
 * seulement être bloquée à un stade ultérieur. */
export function createDependency(input: CreateDependencyInput): CommandResult<Dependency> {
  if (!input.responsibleId) {
    return fail(domainError("dependency_missing_responsible", "Un responsable est requis pour créer une dépendance"));
  }
  const dependency: Dependency = {
    id: input.id,
    projectId: input.projectId,
    sourceEntityId: input.sourceEntityId,
    dependentEntityId: input.dependentEntityId,
    type: input.type,
    responsibleId: input.responsibleId,
    neededByDate: input.neededByDate,
    status: "pending",
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(dependency, []);
}

export function confirmDependency(dependency: Dependency, now: IsoDateTime): CommandResult<Dependency> {
  const next: Dependency = { ...dependency, status: "confirmed", updatedAt: now };
  const events: DomainEvent[] = [
    { type: "dependency.confirmed", occurredAt: now, projectId: dependency.projectId, payload: { dependencyId: dependency.id } },
  ];
  return ok(next, events);
}

export function markDependencyDelayed(dependency: Dependency, delayImpact: string, now: IsoDateTime): CommandResult<Dependency> {
  const next: Dependency = { ...dependency, status: "delayed", delayImpact, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "dependency.delayed", occurredAt: now, projectId: dependency.projectId, payload: { dependencyId: dependency.id } },
  ];
  return ok(next, events);
}

export function resolveDependency(dependency: Dependency, now: IsoDateTime): CommandResult<Dependency> {
  return ok({ ...dependency, status: "resolved", updatedAt: now }, []);
}
