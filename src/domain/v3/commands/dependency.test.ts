import { describe, expect, it } from "vitest";
import { createDependency, confirmDependency, markDependencyDelayed, resolveDependency } from "./dependency";
import type { Dependency } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

describe("createDependency — DEP-001", () => {
  it("refuse sans responsable", () => {
    const result = createDependency({
      id: "dep1",
      projectId: "p1",
      sourceEntityId: "wi1",
      dependentEntityId: "wi2",
      type: "blocks",
      responsibleId: "",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("dependency_missing_responsible");
  });

  it("accepte avec responsable, à l'état pending", () => {
    const result = createDependency({
      id: "dep1",
      projectId: "p1",
      sourceEntityId: "wi1",
      dependentEntityId: "wi2",
      type: "blocks",
      responsibleId: "user-a",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("pending");
  });
});

describe("transitions de suivi", () => {
  const dependency: Dependency = {
    id: "dep1",
    projectId: "p1",
    sourceEntityId: "wi1",
    dependentEntityId: "wi2",
    type: "requires",
    responsibleId: "user-a",
    status: "pending",
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("confirmDependency émet dependency.confirmed", () => {
    const result = confirmDependency(dependency, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("confirmed");
    expect(result.events).toEqual([{ type: "dependency.confirmed", occurredAt: NOW, projectId: "p1", payload: { dependencyId: "dep1" } }]);
  });

  it("markDependencyDelayed pose l'impact et émet dependency.delayed", () => {
    const result = markDependencyDelayed(dependency, "Décale le jalon Design de 3 jours", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("delayed");
    expect(result.state.delayImpact).toBe("Décale le jalon Design de 3 jours");
    expect(result.events).toEqual([{ type: "dependency.delayed", occurredAt: NOW, projectId: "p1", payload: { dependencyId: "dep1" } }]);
  });

  it("resolveDependency passe à resolved sans événement dédié", () => {
    const result = resolveDependency(dependency, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("resolved");
  });
});
