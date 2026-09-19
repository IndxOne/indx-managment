import { describe, expect, it } from "vitest";
import type { Issue } from "../../../../domain/v3/types";
import { issueFromRow, issueToRow } from "./issue";

function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "i1",
    projectId: "p1",
    problem: "Accès VPN indisponible",
    escalated: false,
    status: "open",
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("issueToRow / issueFromRow", () => {
  it("round-trip sans perte, y compris la provenance depuis un Risk (triggerRisk)", () => {
    const original = issue({
      originRiskId: "r1",
      actualImpact: "blocage équipe support",
      blockedEntityId: "wi1",
      resolverId: "user-a",
      correctiveAction: "reset du service VPN",
      targetDate: "2026-09-21T00:00:00.000Z",
      escalated: true,
      status: "resolved",
      resolvedAt: "2026-09-21T10:00:00.000Z",
    });
    const row = issueToRow(original, "w1");
    expect(issueFromRow(row)).toEqual(original);
  });

  it("originRiskId absent (Issue non issue d'un Risk) : null en base, undefined au retour", () => {
    const original = issue();
    const row = issueToRow(original, "w1");
    expect(row.origin_risk_id).toBeNull();
    expect(issueFromRow(row)).toEqual(original);
  });
});
