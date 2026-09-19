import { describe, expect, it } from "vitest";
import type { Decision } from "../../../../domain/v3/types";
import { decisionFromRow, decisionToRow } from "./decision";

function decision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    projectId: "p1",
    question: "Quel fournisseur ERP retenir ?",
    context: "3 devis reçus",
    options: [],
    status: "to_prepare",
    impactedMilestoneIds: [],
    evidenceIds: [],
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("decisionToRow / decisionFromRow", () => {
  it("round-trip sans perte, VO DecisionOption[] en jsonb", () => {
    const original = decision({
      options: [{ label: "Fournisseur A", description: "moins cher" }, { label: "Fournisseur B" }],
      recommendation: "Fournisseur A",
      criteria: "coût, délai",
      deciderId: "user-a",
      dueDate: "2026-10-01T00:00:00.000Z",
      status: "verified",
      outcome: "Fournisseur A retenu",
      reviewConditions: "revue à 6 mois",
      decidedAt: "2026-09-22T00:00:00.000Z",
      appliedAt: "2026-09-23T00:00:00.000Z",
      verifiedAt: "2026-09-24T00:00:00.000Z",
    });
    const row = decisionToRow(original, "w1");
    expect(decisionFromRow(row, [], [])).toEqual(original);
  });

  it("impactedMilestoneIds/evidenceIds reconstruits en paramètre (jonction/evidence), pas en colonne", () => {
    const row = decisionToRow(decision(), "w1");
    expect(row).not.toHaveProperty("impacted_milestone_ids");
    expect(row).not.toHaveProperty("evidence_ids");
    const hydrated = decisionFromRow(row, ["m1", "m2"], ["ev1"]);
    expect(hydrated.impactedMilestoneIds).toEqual(["m1", "m2"]);
    expect(hydrated.evidenceIds).toEqual(["ev1"]);
  });
});
