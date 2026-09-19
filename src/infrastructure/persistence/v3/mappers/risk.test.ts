import { describe, expect, it } from "vitest";
import type { Risk } from "../../../../domain/v3/types";
import { riskFromRow, riskToRow } from "./risk";

function risk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    projectId: "p1",
    event: "Départ du sponsor",
    status: "identified",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("riskToRow / riskFromRow", () => {
  it("round-trip sans perte, y compris la criticité dérivée", () => {
    const original = risk({
      cause: "restructuration",
      consequence: "perte de portage",
      probability: "medium",
      impact: "high",
      criticality: "high",
      strategy: "reduce",
      response: "identifier un sponsor relais",
      ownerId: "user-a",
      trigger: "annonce RH",
      reviewDate: "2026-10-01T00:00:00.000Z",
      residualRisk: "faible",
      status: "under_control",
    });
    const row = riskToRow(original, "w1");
    expect(riskFromRow(row)).toEqual(original);
  });

  it("champs de qualification absents avant qualifyRisk restent undefined après round-trip", () => {
    const original = risk();
    const row = riskToRow(original, "w1");
    expect(row.probability).toBeNull();
    expect(row.criticality).toBeNull();
    expect(riskFromRow(row)).toEqual(original);
  });
});
