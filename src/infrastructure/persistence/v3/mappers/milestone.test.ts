import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../../domain/v3/types";
import { milestoneFromRow, milestoneToRow } from "./milestone";

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "m1",
    projectId: "p1",
    observableResult: "Design validé",
    targetDate: "2026-10-01T00:00:00.000Z",
    dependencyIds: [],
    acceptanceCriteria: [],
    evidenceIds: [],
    status: "planned",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("milestoneToRow / milestoneFromRow", () => {
  it("round-trip sans perte, y compris le VO AcceptanceCriterion[] en jsonb", () => {
    const original = milestone({
      stageId: "stage1",
      forecastDate: "2026-10-05T00:00:00.000Z",
      acceptanceCriteria: [{ description: "Maquettes validées", satisfied: true }],
      approverId: "user-a",
      status: "accepted",
      reviewedAt: "2026-09-25T00:00:00.000Z",
    });
    const row = milestoneToRow(original, "w1");
    expect(row).not.toHaveProperty("dependency_ids");
    expect(row).not.toHaveProperty("evidence_ids");
    expect(milestoneFromRow(row, [], [])).toEqual(original);
  });

  it("dependencyIds/evidenceIds sont injectés par le repository, jamais lus depuis la ligne", () => {
    const row = milestoneToRow(milestone(), "w1");
    const hydrated = milestoneFromRow(row, ["dep1"], ["ev1"]);
    expect(hydrated.dependencyIds).toEqual(["dep1"]);
    expect(hydrated.evidenceIds).toEqual(["ev1"]);
  });
});
