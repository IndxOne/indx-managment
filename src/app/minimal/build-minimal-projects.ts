import type { Objective, Project, ProjectStatus, WorkItem } from "../../domain/v3/types";

export interface MinimalProjectCard {
  id: string;
  name: string;
  status: ProjectStatus;
  objective?: string;
  nextAction?: { title: string; dueDate?: string };
  targetDate?: string;
  projectManager?: string;
  updatedAt: string;
}

const CLOSED = new Set(["done", "cancelled"]);
const byDue = (a: WorkItem, b: WorkItem) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** Projection de lecture « Mes projets » : composition pure, aucune règle, aucune donnée inventée.
 * Objectif = premier objectif actif ; prochaine action = action ouverte à l'échéance la plus proche. */
export function buildMinimalProjects(input: { projects: Project[]; objectives: Objective[]; workItems: WorkItem[] }): MinimalProjectCard[] {
  return [...input.projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
    .map((p) => {
      const objective = input.objectives
        .filter((o) => o.projectId === p.id && o.status === "active")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
      const next = input.workItems.filter((w) => w.projectId === p.id && !CLOSED.has(w.status)).sort(byDue)[0];
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        objective: objective?.statement,
        nextAction: next ? { title: next.title, dueDate: next.dueDate } : undefined,
        targetDate: p.targetDate,
        projectManager: p.projectManager,
        updatedAt: p.updatedAt,
      };
    });
}
