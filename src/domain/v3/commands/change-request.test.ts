import { describe, expect, it } from "vitest";
import { createChangeRequest, submitChangeRequestForAnalysis, decideChangeRequest } from "./change-request";
import type { ChangeRequest } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseChangeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  const created = createChangeRequest({ id: "cr1", projectId: "p1", request: "Ajouter un module reporting", origin: "Sponsor", now: NOW });
  if (!created.ok) throw new Error("fixture invalide");
  return { ...created.state, ...overrides };
}

describe("createChangeRequest", () => {
  it("crée en submitted et émet change.requested", () => {
    const result = createChangeRequest({ id: "cr1", projectId: "p1", request: "R", origin: "O", now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("submitted");
    expect(result.events).toEqual([{ type: "change.requested", occurredAt: NOW, projectId: "p1", payload: { changeRequestId: "cr1" } }]);
  });
});

describe("submitChangeRequestForAnalysis — CHG-001", () => {
  it("refuse sans aucune dimension d'impact renseignée", () => {
    const result = submitChangeRequestForAnalysis(baseChangeRequest(), {}, [], NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("change_request_missing_impact_analysis");
  });

  it("accepte dès qu'une dimension d'impact est renseignée", () => {
    const result = submitChangeRequestForAnalysis(baseChangeRequest(), { schedule: "+2 semaines" }, [], NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("under_analysis");
  });
});

describe("decideChangeRequest", () => {
  it("refuse depuis submitted (doit passer par under_analysis)", () => {
    const result = decideChangeRequest(baseChangeRequest(), "d1", "applied", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("change_request_invalid_transition");
  });

  it("applied depuis under_analysis, lie la décision", () => {
    const analyzed = baseChangeRequest({ status: "under_analysis", impact: { schedule: "+2 semaines" } });
    const result = decideChangeRequest(analyzed, "d1", "applied", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("applied");
    expect(result.state.linkedDecisionId).toBe("d1");
    expect(result.events).toEqual([{ type: "change.decided", occurredAt: NOW, projectId: "p1", payload: { changeRequestId: "cr1", decisionId: "d1" } }]);
  });

  it("rejected depuis under_analysis", () => {
    const analyzed = baseChangeRequest({ status: "under_analysis", impact: { cost: "+15k€" } });
    const result = decideChangeRequest(analyzed, "d1", "rejected", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("rejected");
  });
});
