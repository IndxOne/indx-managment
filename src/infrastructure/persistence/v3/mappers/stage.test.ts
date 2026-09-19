import { describe, expect, it } from "vitest";
import type { Stage } from "../../../../domain/v3/types";
import { stageFromRow, stageToRow } from "./stage";

describe("stageToRow / stageFromRow", () => {
  it("round-trip sans perte (pas de updated_at, fidèle au type domaine)", () => {
    const original: Stage = {
      id: "stage1",
      projectId: "p1",
      name: "Cadrage",
      order: 1,
      status: "active",
      createdAt: "2026-09-20T08:00:00.000Z",
    };
    const row = stageToRow(original, "w1");
    expect(row).not.toHaveProperty("updated_at");
    expect(stageFromRow(row)).toEqual(original);
  });
});
