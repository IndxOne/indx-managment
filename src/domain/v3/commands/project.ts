import type { Project, ProjectMethod, Criticality, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { ok, type CommandResult } from "../result";

export interface CreateProjectInput {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  method: ProjectMethod;
  criticality: Criticality;
  now: IsoDateTime;
  sponsor?: string;
  projectManager?: string;
  targetDate?: IsoDateTime;
}

/** Aucun invariant structurel ne bloque la création — un projet peut
 * démarrer incomplet (sponsor/date cible arrivent souvent après coup) ;
 * c'est au moteur de règles (Lot 2) de le signaler, pas au domaine de
 * l'interdire. Aucun objectif requis à la création : createObjective +
 * addObjectiveToProject se posent ensuite (0..n objectifs, cf. Objective). */
export function createProject(input: CreateProjectInput): CommandResult<Project> {
  const project: Project = {
    id: input.id,
    workspaceId: input.workspaceId,
    name: input.name,
    sponsor: input.sponsor,
    projectManager: input.projectManager,
    method: input.method,
    criticality: input.criticality,
    status: "on_track",
    targetDate: input.targetDate,
    objectiveIds: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
  const events: DomainEvent[] = [
    { type: "project.created", occurredAt: input.now, projectId: project.id, payload: { projectId: project.id, workspaceId: project.workspaceId } },
  ];
  return ok(project, events);
}

export function addObjectiveToProject(project: Project, objectiveId: EntityId, now: IsoDateTime): CommandResult<Project> {
  if (project.objectiveIds.includes(objectiveId)) {
    return ok(project, []);
  }
  return ok({ ...project, objectiveIds: [...project.objectiveIds, objectiveId], updatedAt: now }, []);
}
