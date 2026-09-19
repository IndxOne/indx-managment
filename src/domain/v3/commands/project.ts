import type { Project, ProjectMethod, Criticality, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { ok, type CommandResult } from "../result";

export interface CreateProjectInput {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  objective: string;
  method: ProjectMethod;
  criticality: Criticality;
  now: IsoDateTime;
  expectedValue?: string;
  sponsor?: string;
  projectManager?: string;
  targetDate?: IsoDateTime;
}

/** Aucun invariant structurel ne bloque la création — un projet peut
 * démarrer incomplet (sponsor/date cible arrivent souvent après coup) ;
 * c'est au moteur de règles (Lot 2) de le signaler, pas au domaine de
 * l'interdire. */
export function createProject(input: CreateProjectInput): CommandResult<Project> {
  const project: Project = {
    id: input.id,
    workspaceId: input.workspaceId,
    name: input.name,
    objective: input.objective,
    expectedValue: input.expectedValue,
    sponsor: input.sponsor,
    projectManager: input.projectManager,
    method: input.method,
    criticality: input.criticality,
    status: "on_track",
    targetDate: input.targetDate,
    createdAt: input.now,
    updatedAt: input.now,
  };
  const events: DomainEvent[] = [
    { type: "project.created", occurredAt: input.now, projectId: project.id, payload: { projectId: project.id, workspaceId: project.workspaceId } },
  ];
  return ok(project, events);
}
