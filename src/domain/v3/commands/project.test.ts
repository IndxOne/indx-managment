import { describe, expect, it } from "vitest";
import { createProject, addObjectiveToProject } from "./project";
import type { Project } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

describe("createProject", () => {
  it("crée un projet on_track, sans objectif, et émet project.created", () => {
    const result = createProject({
      id: "p1",
      workspaceId: "w1",
      name: "Migration M365",
      method: "predictive",
      criticality: "high",
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      id: "p1",
      workspaceId: "w1",
      status: "on_track",
      objectiveIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result.events).toEqual([
      { type: "project.created", occurredAt: NOW, projectId: "p1", payload: { projectId: "p1", workspaceId: "w1" } },
    ]);
  });

  it("accepte un projet incomplet (sponsor/date cible absents) — le domaine ne bloque pas la création", () => {
    const result = createProject({ id: "p2", workspaceId: "w1", name: "Projet sans sponsor", method: "agile", criticality: "low", now: NOW });
    expect(result.ok).toBe(true);
  });
});

describe("addObjectiveToProject", () => {
  const project: Project = {
    id: "p1",
    workspaceId: "w1",
    name: "Migration M365",
    method: "predictive",
    criticality: "high",
    status: "on_track",
    objectiveIds: [],
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("ajoute un objectif et supporte les objectifs multiples", () => {
    const withFirst = addObjectiveToProject(project, "obj1", NOW);
    expect(withFirst.ok).toBe(true);
    if (!withFirst.ok) return;
    const withSecond = addObjectiveToProject(withFirst.state, "obj2", NOW);
    expect(withSecond.ok).toBe(true);
    if (!withSecond.ok) return;
    expect(withSecond.state.objectiveIds).toEqual(["obj1", "obj2"]);
  });

  it("est idempotent : ajouter deux fois le même objectif ne le duplique pas", () => {
    const once = addObjectiveToProject(project, "obj1", NOW);
    if (!once.ok) throw new Error("setup");
    const twice = addObjectiveToProject(once.state, "obj1", NOW);
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.state.objectiveIds).toEqual(["obj1"]);
  });
});
