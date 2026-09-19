import { describe, expect, it } from "vitest";
import type { Project } from "../../../../domain/v3/types";
import { projectFromRow, projectToRow } from "./project";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    workspaceId: "22222222-2222-2222-2222-222222222222",
    name: "Migration M365",
    method: "predictive",
    criticality: "high",
    status: "on_track",
    objectiveIds: [],
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("projectToRow / projectFromRow", () => {
  it("round-trip sans perte (objectiveIds reconstruit séparément, jamais en colonne)", () => {
    const original = project({ objectiveIds: ["obj1", "obj2"] });
    const row = projectToRow(original);
    expect(row).not.toHaveProperty("objective_ids");
    expect(projectFromRow(row, original.objectiveIds)).toEqual(original);
  });

  it("champs optionnels absents deviennent null en base puis undefined au retour", () => {
    const original = project();
    const row = projectToRow(original);
    expect(row.sponsor).toBeNull();
    expect(row.current_stage_id).toBeNull();
    expect(projectFromRow(row, [])).toEqual(original);
  });

  it("préserve tous les champs optionnels renseignés", () => {
    const original = project({
      sponsor: "DSI",
      projectManager: "A. Martin",
      targetDate: "2026-12-01T00:00:00.000Z",
      forecastDate: "2026-12-15T00:00:00.000Z",
      currentStageId: "stage1",
      lastReviewedAt: "2026-09-19T00:00:00.000Z",
    });
    const row = projectToRow(original);
    expect(projectFromRow(row, [])).toEqual(original);
  });
});
