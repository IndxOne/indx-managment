import { describe, expect, it } from "vitest";
import { createObjective, closeObjective } from "./objective";
import type { Objective } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

describe("createObjective", () => {
  it("crée un objectif actif, sans propriétaire requis", () => {
    const result = createObjective({ id: "obj1", projectId: "p1", statement: "Migrer 50 postes vers M365", now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({ id: "obj1", projectId: "p1", status: "active" });
  });
});

describe("closeObjective", () => {
  const active: Objective = {
    id: "obj1",
    projectId: "p1",
    statement: "Migrer 50 postes vers M365",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("achieved depuis active", () => {
    const result = closeObjective(active, "achieved", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("achieved");
  });

  it("abandoned depuis active", () => {
    const result = closeObjective(active, "abandoned", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("abandoned");
  });

  it("refuse de clore un objectif déjà clos (états terminaux)", () => {
    const achieved: Objective = { ...active, status: "achieved" };
    const result = closeObjective(achieved, "abandoned", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("objective_invalid_transition");
  });
});
