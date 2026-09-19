import { describe, expect, it } from "vitest";
import type { ChangeRequest } from "../../../../domain/v3/types";
import { changeRequestFromRow, changeRequestToRow } from "./change-request";

function changeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: "cr1",
    projectId: "p1",
    request: "Ajouter un module reporting",
    origin: "client",
    impact: {},
    options: [],
    status: "submitted",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("changeRequestToRow / changeRequestFromRow", () => {
  it("round-trip sans perte, VO ImpactAssessment + DecisionOption[] en jsonb", () => {
    const original = changeRequest({
      justification: "demande récurrente client",
      impact: { scope: "ajout module", schedule: "+2 semaines", cost: "+5k€" },
      options: [{ label: "accepter" }, { label: "refuser", description: "hors scope contractuel" }],
      recommendation: "accepter",
      deciderId: "user-a",
      status: "applied",
      linkedDecisionId: "d1",
    });
    const row = changeRequestToRow(original, "w1");
    expect(changeRequestFromRow(row)).toEqual(original);
  });

  it("impact vide ({}) survit au round-trip", () => {
    const original = changeRequest();
    const row = changeRequestToRow(original, "w1");
    expect(changeRequestFromRow(row)).toEqual(original);
  });
});
