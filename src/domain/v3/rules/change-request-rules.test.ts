import { describe, expect, it } from "vitest";
import type { ChangeRequest } from "../types";
import { evaluateChangeRequestRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

function changeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: "cr1",
    projectId: "p1",
    request: "Ajouter un module reporting",
    origin: "client",
    impact: {},
    options: [],
    status: "submitted",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function resultOf(cr: ChangeRequest) {
  const [result] = evaluateChangeRequestRules(cr, { now: NOW });
  if (!result) throw new Error("CHG-001 devrait toujours produire un résultat");
  return result;
}

describe("CHG-001 — analyse d'impact manquante", () => {
  it("violée sans analyse d'impact en submitted", () => {
    expect(resultOf(changeRequest()).status).toBe("violated");
  });

  it("satisfaite avec analyse d'impact", () => {
    expect(resultOf(changeRequest({ impact: { scope: "ajout module" } })).status).toBe("satisfied");
  });

  it("non applicable au-delà de submitted", () => {
    expect(resultOf(changeRequest({ status: "under_analysis" })).status).toBe("not_applicable");
  });
});

describe("cohérence règle <-> commande", () => {
  it("CHG-001 violée => submitChangeRequestForAnalysis échoue avec change_request_missing_impact_analysis", async () => {
    const { submitChangeRequestForAnalysis } = await import("../commands/change-request");
    const cr = changeRequest();
    expect(resultOf(cr).status).toBe("violated");
    const result = submitChangeRequestForAnalysis(cr, {}, [], NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("change_request_missing_impact_analysis");
  });
});

describe("déterminisme et non-mutation", () => {
  it("résultats identiques sur deux appels", () => {
    const cr = changeRequest();
    expect(evaluateChangeRequestRules(cr, { now: NOW })).toEqual(evaluateChangeRequestRules(cr, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const cr = changeRequest();
    const snapshot = { ...cr };
    evaluateChangeRequestRules(cr, { now: NOW });
    expect(cr).toEqual(snapshot);
  });
});
