import { describe, expect, it } from "vitest";
import type { Dependency } from "../../../../domain/v3/types";
import { dependencyFromRow, dependencyToRow } from "./dependency";

function dependency(overrides: Partial<Dependency> = {}): Dependency {
  return {
    id: "dep1",
    projectId: "p1",
    sourceEntityId: "wi1",
    dependentEntityId: "wi2",
    type: "blocks",
    responsibleId: "user-a",
    status: "pending",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("dependencyToRow / dependencyFromRow", () => {
  it("round-trip sans perte", () => {
    const original = dependency({ neededByDate: "2026-10-01T00:00:00.000Z", status: "delayed", delayImpact: "retard fournisseur" });
    const row = dependencyToRow(original, "w1");
    expect(dependencyFromRow(row)).toEqual(original);
  });

  it("responsibleId (invariant DEP-001) est obligatoire côté domaine et toujours présent en base", () => {
    const row = dependencyToRow(dependency(), "w1");
    expect(row.responsible_id).toBe("user-a");
  });
});
