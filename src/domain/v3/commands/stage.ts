import type { Stage, EntityId, IsoDateTime } from "../types";
import { ok, type CommandResult } from "../result";

export interface CreateStageInput {
  id: EntityId;
  projectId: EntityId;
  name: string;
  order: number;
  now: IsoDateTime;
}

/**
 * Seule commande Stage à ce jour (Lot 5, gate validée) : aucune commande de
 * transition, aucun `updatedAt` — rien ne mute Stage après création. Refonte
 * du cycle Stage explicitement hors périmètre.
 */
export function createStage(input: CreateStageInput): CommandResult<Stage> {
  const stage: Stage = {
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    order: input.order,
    status: "not_started",
    createdAt: input.now,
  };
  return ok(stage, []);
}
