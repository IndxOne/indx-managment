import { describe, expect, it } from "vitest";
import { createRisk, qualifyRisk, planRiskResponse, controlRisk, closeRisk, triggerRisk } from "./risk";
import type { Risk, RiskProbability, RiskImpact, Criticality } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseRisk(overrides: Partial<Risk> = {}): Risk {
  const created = createRisk({ id: "r1", projectId: "p1", event: "Indisponibilité prestataire", now: NOW });
  if (!created.ok) throw new Error("fixture invalide");
  return { ...created.state, ...overrides };
}

describe("qualifyRisk — matrice de criticité", () => {
  const matrix: Array<[RiskProbability, RiskImpact, Criticality]> = [
    ["low", "low", "low"],
    ["low", "medium", "low"],
    ["low", "high", "medium"],
    ["medium", "low", "low"],
    ["medium", "medium", "medium"],
    ["medium", "high", "high"],
    ["high", "low", "medium"],
    ["high", "medium", "high"],
    ["high", "high", "critical"],
  ];

  for (const [probability, impact, expected] of matrix) {
    it(`probabilité=${probability} × impact=${impact} => criticité=${expected}`, () => {
      const result = qualifyRisk(baseRisk(), probability, impact, NOW);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.criticality).toBe(expected);
      expect(result.events).toEqual([{ type: "risk.qualified", occurredAt: NOW, projectId: "p1", payload: { riskId: "r1", criticality: expected } }]);
    });
  }
});

describe("planRiskResponse — RSK-002", () => {
  it("refuse un risque critique sans propriétaire", () => {
    const qualified = baseRisk({ status: "qualified", criticality: "critical" });
    const result = planRiskResponse(qualified, "reduce", "Plan de contingence", "", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("risk_critical_without_owner");
  });

  it("refuse un risque critique sans réponse", () => {
    const qualified = baseRisk({ status: "qualified", criticality: "critical" });
    const result = planRiskResponse(qualified, "reduce", "", "user-a", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("risk_critical_without_response");
  });

  it("accepte un risque faible sans propriétaire (pas d'exigence RSK-002 en dessous de high)", () => {
    const qualified = baseRisk({ status: "qualified", criticality: "low" });
    const result = planRiskResponse(qualified, "accept", "", "", NOW);
    expect(result.ok).toBe(true);
  });

  it("accepte un risque critique avec propriétaire et réponse, émet risk.response_planned", () => {
    const qualified = baseRisk({ status: "qualified", criticality: "critical" });
    const result = planRiskResponse(qualified, "reduce", "Plan de contingence", "user-a", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("response_planned");
    expect(result.events).toEqual([{ type: "risk.response_planned", occurredAt: NOW, projectId: "p1", payload: { riskId: "r1" } }]);
  });
});

describe("cycle identified -> qualified -> response_planned -> under_control -> closed", () => {
  it("under_control puis closed produisent les transitions attendues", () => {
    const planned = baseRisk({ status: "response_planned" });
    const controlled = controlRisk(planned, NOW);
    expect(controlled.ok).toBe(true);
    if (!controlled.ok) return;
    expect(controlled.state.status).toBe("under_control");

    const closed = closeRisk(controlled.state, "Risque résiduel faible, accepté", NOW);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.state.status).toBe("closed");
    expect(closed.state.residualRisk).toBe("Risque résiduel faible, accepté");
  });

  it("refuse de clore un risque non sous contrôle", () => {
    const identified = baseRisk({ status: "identified" });
    expect(closeRisk(identified, undefined, NOW).ok).toBe(false);
  });
});

describe("triggerRisk — matérialisation en Issue distincte", () => {
  it("crée une Issue liée par originRiskId, sans muter le statut du Risk", () => {
    const risk = baseRisk({ status: "under_control" });
    const result = triggerRisk(risk, { issueId: "iss1", problem: "Le prestataire a effectivement cessé son activité", now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toMatchObject({ id: "iss1", originRiskId: "r1", status: "open", escalated: false });
    expect(result.events).toEqual([{ type: "risk.triggered", occurredAt: NOW, projectId: "p1", payload: { riskId: "r1", issueId: "iss1" } }]);
  });
});
