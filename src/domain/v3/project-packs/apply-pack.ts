import type { Project, Stage, Objective, Milestone, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { createStage } from "../commands/stage";
import { createObjective } from "../commands/objective";
import { addObjectiveToProject } from "../commands/project";
import { createMilestone } from "../commands/milestone";
import { uuidV5 } from "../../../recurrence/deterministic-uuid";
import { packKey, type ProjectPack } from "./types";

/** Namespace fixe (UUID v4 arbitraire, jamais réutilisé ailleurs) — même
 * patron que RECURRENCE_OCCURRENCE_NAMESPACE (src/recurrence). */
const PROJECT_PACK_NAMESPACE = "6f2b3a5e-6a63-4b2e-9d90-6a6a6b6f9a10";

function isValidOffset(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/** Ajout de `days` × 24h en UTC — aucune dépendance à la timezone locale
 * ni au DST (§4 du correctif de gate) : setUTCDate/toISOString opèrent
 * exclusivement en UTC quel que soit l'environnement d'exécution. */
function addUtcDays(iso: IsoDateTime, days: number): IsoDateTime {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function deriveId(projectId: string, key: string, slot: string): string {
  return uuidV5(PROJECT_PACK_NAMESPACE, `${projectId}:${key}:${slot}`);
}

export interface ApplyProjectPackInput {
  project: Project;
  pack: ProjectPack;
  now: IsoDateTime;
}

export interface ApplyProjectPackResult {
  project: Project;
  stages: Stage[];
  objectives: Objective[];
  milestones: Milestone[];
}

/**
 * Applique un ProjectPack à un Project (Lot 5, gate validée) — composition
 * pure de commandes domaine existantes, jamais `{ ...pack } → INSERT`
 * (cahier §6). IDs dérivés déterministes (project.id + pack.id@version +
 * type + index, via uuidV5 — même mécanisme que le moteur de récurrence
 * V2) : deux appels avec les mêmes entrées produisent strictement les
 * mêmes entités/IDs. Le domaine ne sait pas si ce pack a déjà été persisté
 * — l'idempotence de persistance est un concern d'infrastructure, différé
 * (§1 du correctif de gate). `project.method`/`status` ne sont jamais
 * modifiés : `pack.method` reste purement informatif (§7).
 */
export function applyProjectPack(input: ApplyProjectPackInput): CommandResult<ApplyProjectPackResult> {
  const { project, pack, now } = input;
  const key = packKey(pack);

  for (const milestone of pack.milestones) {
    if (!isValidOffset(milestone.targetOffsetDays)) {
      return fail(
        domainError(
          "project_pack_invalid",
          `targetOffsetDays invalide pour "${milestone.observableResult}" (${key}) : doit être un entier >= 0`,
          project.id
        )
      );
    }
  }

  const events: DomainEvent[] = [];

  const stages: Stage[] = [];
  for (let i = 0; i < pack.stages.length; i++) {
    const s = pack.stages[i]!;
    const result = createStage({ id: deriveId(project.id, key, `stage:${i}`), projectId: project.id, name: s.name, order: s.order, now });
    if (!result.ok) return fail(result.error);
    events.push(...result.events);
    stages.push(result.state);
  }

  const objectives: Objective[] = [];
  let nextProject = project;
  for (let i = 0; i < pack.objectives.length; i++) {
    const o = pack.objectives[i]!;
    const result = createObjective({
      id: deriveId(project.id, key, `objective:${i}`),
      projectId: project.id,
      statement: o.statement,
      expectedValue: o.expectedValue,
      now,
    });
    if (!result.ok) return fail(result.error);
    events.push(...result.events);
    objectives.push(result.state);

    const linked = addObjectiveToProject(nextProject, result.state.id, now);
    if (!linked.ok) return fail(linked.error);
    events.push(...linked.events);
    nextProject = linked.state;
  }

  const milestones: Milestone[] = [];
  for (let i = 0; i < pack.milestones.length; i++) {
    const m = pack.milestones[i]!;
    const stageId = m.stageIndex !== undefined ? stages[m.stageIndex]?.id : undefined;
    const result = createMilestone({
      id: deriveId(project.id, key, `milestone:${i}`),
      projectId: project.id,
      observableResult: m.observableResult,
      targetDate: addUtcDays(now, m.targetOffsetDays),
      stageId,
      now,
    });
    if (!result.ok) return fail(result.error);
    events.push(...result.events);
    milestones.push(result.state);
  }

  events.push({ type: "project.pack_selected", occurredAt: now, projectId: project.id, payload: { packId: pack.id, packVersion: pack.version } });

  return ok({ project: nextProject, stages, objectives, milestones }, events);
}
