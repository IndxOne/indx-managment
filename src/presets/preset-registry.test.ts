import { describe, expect, it } from "vitest";
import type { Workspace } from "../domain/workspace";
import {
  computeHiddenFieldsOnApproachChange,
  isRecommendedApproach,
  resolveWorkspacePreset,
} from "./preset-registry";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Test",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveWorkspacePreset", () => {
  it("résout le préréglage déclaratif correspondant à l'approche", () => {
    const preset = resolveWorkspacePreset(workspace({ approach: "project_amoa" }));
    expect(preset.defaultView).toBe("phase");
    expect(preset.phaseTemplate).toEqual(["cadrage", "conception", "realisation", "deploiement"]);
  });

  it("propose quatre colonnes métier pour chaque approche utilisable en projet", () => {
    for (const approach of ["simple", "project_amoa", "product_tech", "management"] as const) {
      expect(resolveWorkspacePreset(workspace({ approach })).phaseTemplate).toHaveLength(4);
    }
    expect(resolveWorkspacePreset(workspace({ approach: "it_ops" })).phaseTemplate).toBeUndefined();
  });
});

describe("isRecommendedApproach", () => {
  it("suit la matrice nature x approche du cadrage §5", () => {
    expect(isRecommendedApproach("run", "it_ops")).toBe(true);
    expect(isRecommendedApproach("project", "product_tech")).toBe(true);
    expect(isRecommendedApproach("project", "it_ops")).toBe(false); // non recommandé mais pas bloqué
  });
});

describe("computeHiddenFieldsOnApproachChange", () => {
  it("détecte les champs utilisés qui deviendraient masqués", () => {
    const hidden = computeHiddenFieldsOnApproachChange("it_ops", "simple", [
      "title",
      "status",
      "category",
      "waitingSince",
    ]);
    expect(hidden.sort()).toEqual(["category", "waitingSince"]);
  });

  it("ne signale rien si tous les champs restent visibles", () => {
    const hidden = computeHiddenFieldsOnApproachChange("simple", "management", ["title", "status"]);
    expect(hidden).toEqual([]);
  });
});
