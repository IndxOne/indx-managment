import { describe, expect, it } from "vitest";
import type { Objective, Project, WorkItem } from "../../domain/v3/types";
import { buildMinimalProjects } from "./build-minimal-projects";

const project = (o: Partial<Project> = {}): Project => ({
  id: "p1", workspaceId: "ws", name: "A", method: "predictive", criticality: "medium", status: "on_track",
  objectiveIds: [], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z", ...o,
});
const objective = (o: Partial<Objective> = {}): Objective => ({
  id: "o1", projectId: "p1", statement: "But", status: "active", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", ...o,
});
const work = (o: Partial<WorkItem> = {}): WorkItem => ({
  id: "w1", projectId: "p1", type: "task", title: "T", status: "in_progress", priority: "normal",
  acceptanceCriteria: [], dependencyIds: [], evidenceIds: [], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", ...o,
});

describe("buildMinimalProjects", () => {
  it("projet sans objectif ni action : champs absents, jamais inventés", () => {
    expect(buildMinimalProjects({ projects: [project()], objectives: [], workItems: [] })[0]).toMatchObject({ id: "p1", name: "A", objective: undefined, nextAction: undefined });
  });
  it("objectif actif le plus ancien ; objectifs clos ignorés", () => {
    const r = buildMinimalProjects({
      projects: [project()],
      objectives: [objective({ id: "o3", statement: "Récent", createdAt: "2026-11-05T00:00:00.000Z" }), objective({ id: "o2", statement: "Clos", status: "achieved" }), objective({ id: "o1", statement: "Premier" })],
      workItems: [],
    });
    expect(r[0]!.objective).toBe("Premier");
  });
  it("prochaine action : échéance la plus proche, actions terminées ou annulées ignorées, sans échéance en dernier", () => {
    const r = buildMinimalProjects({
      projects: [project()],
      objectives: [],
      workItems: [
        work({ id: "a", title: "Sans échéance" }),
        work({ id: "b", title: "Terminée", status: "done", dueDate: "2026-11-01T00:00:00.000Z" }),
        work({ id: "c", title: "Plus tard", dueDate: "2026-12-20T00:00:00.000Z" }),
        work({ id: "d", title: "Bientôt", dueDate: "2026-11-20T00:00:00.000Z" }),
        work({ id: "e", title: "Annulée", status: "cancelled", dueDate: "2026-11-10T00:00:00.000Z" }),
      ],
    });
    expect(r[0]!.nextAction).toEqual({ title: "Bientôt", dueDate: "2026-11-20T00:00:00.000Z" });
  });
  it("n'attribue jamais les données d'un projet à un autre ; tri par mise à jour décroissante", () => {
    const r = buildMinimalProjects({
      projects: [project({ id: "p1", updatedAt: "2026-11-01T00:00:00.000Z" }), project({ id: "p2", name: "B", updatedAt: "2026-11-09T00:00:00.000Z" })],
      objectives: [objective({ projectId: "p2", statement: "Pour B" })],
      workItems: [work({ projectId: "p2", title: "Pour B" })],
    });
    expect(r.map((c) => c.id)).toEqual(["p2", "p1"]);
    expect(r[0]).toMatchObject({ objective: "Pour B" });
    expect(r[1]).toMatchObject({ objective: undefined, nextAction: undefined });
  });
});
