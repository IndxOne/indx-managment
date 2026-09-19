import { describe, expect, it } from "vitest";
import { createProject } from "./project";

describe("createProject", () => {
  it("crée un projet on_track et émet project.created", () => {
    const result = createProject({
      id: "p1",
      workspaceId: "w1",
      name: "Migration M365",
      objective: "Migrer 50 postes vers M365",
      method: "predictive",
      criticality: "high",
      now: "2026-09-20T08:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({
      id: "p1",
      workspaceId: "w1",
      status: "on_track",
      createdAt: "2026-09-20T08:00:00.000Z",
      updatedAt: "2026-09-20T08:00:00.000Z",
    });
    expect(result.events).toEqual([
      {
        type: "project.created",
        occurredAt: "2026-09-20T08:00:00.000Z",
        projectId: "p1",
        payload: { projectId: "p1", workspaceId: "w1" },
      },
    ]);
  });

  it("accepte un projet incomplet (sponsor/date cible absents) — le domaine ne bloque pas la création", () => {
    const result = createProject({
      id: "p2",
      workspaceId: "w1",
      name: "Projet sans sponsor",
      objective: "TBD",
      method: "agile",
      criticality: "low",
      now: "2026-09-20T08:00:00.000Z",
    });
    expect(result.ok).toBe(true);
  });
});
