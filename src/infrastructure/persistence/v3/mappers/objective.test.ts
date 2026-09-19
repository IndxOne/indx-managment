import { describe, expect, it } from "vitest";
import type { Objective } from "../../../../domain/v3/types";
import { objectiveFromRow, objectiveToRow } from "./objective";

function objective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: "obj1",
    projectId: "p1",
    statement: "Migrer 50 postes vers M365",
    status: "active",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("objectiveToRow / objectiveFromRow", () => {
  it("round-trip sans perte", () => {
    const original = objective({ expectedValue: "-30% tickets support", ownerId: "user-a", status: "achieved" });
    const row = objectiveToRow(original, "w1");
    expect(row.workspace_id).toBe("w1");
    expect(objectiveFromRow(row)).toEqual(original);
  });

  it("champs optionnels absents : null en base, undefined au retour", () => {
    const original = objective();
    const row = objectiveToRow(original, "w1");
    expect(row.expected_value).toBeNull();
    expect(row.owner_id).toBeNull();
    expect(objectiveFromRow(row)).toEqual(original);
  });
});
