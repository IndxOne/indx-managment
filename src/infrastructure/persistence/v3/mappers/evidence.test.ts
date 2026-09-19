import { describe, expect, it } from "vitest";
import type { Evidence } from "../../../../domain/v3/types";
import { evidenceFromRow, evidenceToRow } from "./evidence";

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "ev1",
    projectId: "p1",
    provedEntityType: "milestone",
    provedEntityId: "m1",
    type: "document",
    description: "PV de recette signé",
    validationStatus: "pending",
    createdAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("evidenceToRow / evidenceFromRow", () => {
  it("round-trip sans perte (pas de updated_at, fidèle au type domaine)", () => {
    const original = evidence({ source: "SharePoint", authorId: "user-a", validationStatus: "validated" });
    const row = evidenceToRow(original, "w1");
    expect(row).not.toHaveProperty("updated_at");
    expect(evidenceFromRow(row)).toEqual(original);
  });
});
