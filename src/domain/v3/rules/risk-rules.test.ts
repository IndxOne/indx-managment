import { describe, expect, it } from "vitest";
import type { Risk } from "../types";
import { evaluateRiskRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

function risk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    projectId: "p1",
    event: "Départ du sponsor",
    status: "qualified",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function resultOf(r: Risk, ruleId: string) {
  return evaluateRiskRules(r, { now: NOW }).find((x) => x.ruleId === ruleId);
}

describe("RSK-002 — propriétaire manquant (high/critical)", () => {
  it("non applicable si criticité faible/moyenne", () => {
    expect(resultOf(risk({ criticality: "low" }), "RSK-002")?.status).toBe("not_applicable");
    expect(resultOf(risk({ criticality: "medium" }), "RSK-002")?.status).toBe("not_applicable");
  });

  it("violée si high sans propriétaire", () => {
    expect(resultOf(risk({ criticality: "high" }), "RSK-002")?.status).toBe("violated");
  });

  it("satisfaite si critical avec propriétaire", () => {
    expect(resultOf(risk({ criticality: "critical", ownerId: "user-a" }), "RSK-002")?.status).toBe("satisfied");
  });

  it("non applicable si déjà clos", () => {
    expect(resultOf(risk({ criticality: "critical", status: "closed" }), "RSK-002")?.status).toBe("not_applicable");
  });
});

describe("RSK-003 — réponse manquante (high/critical)", () => {
  it("violée si critical sans réponse", () => {
    expect(resultOf(risk({ criticality: "critical" }), "RSK-003")?.status).toBe("violated");
  });

  it("satisfaite si high avec réponse", () => {
    expect(resultOf(risk({ criticality: "high", response: "mitigation" }), "RSK-003")?.status).toBe("satisfied");
  });
});

describe("RSK-004 — risque critique encore ouvert", () => {
  it("non applicable si criticité faible", () => {
    expect(resultOf(risk({ criticality: "low" }), "RSK-004")?.status).toBe("not_applicable");
  });

  it("violée si high/critical et non clos", () => {
    expect(resultOf(risk({ criticality: "high", status: "under_control" }), "RSK-004")?.status).toBe("violated");
  });

  it("satisfaite si clos", () => {
    expect(resultOf(risk({ criticality: "critical", status: "closed" }), "RSK-004")?.status).toBe("satisfied");
  });
});

describe("cohérence règle <-> commande (RSK-002/003 mirent planRiskResponse)", () => {
  it("si RSK-002 est violée, planRiskResponse échoue avec risk_critical_without_owner", async () => {
    const { planRiskResponse } = await import("../commands/risk");
    const r = risk({ criticality: "high" });
    expect(resultOf(r, "RSK-002")?.status).toBe("violated");
    const result = planRiskResponse(r, "reduce", "réponse définie", "", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("risk_critical_without_owner");
  });

  it("si RSK-003 est violée, planRiskResponse échoue avec risk_critical_without_response", async () => {
    const { planRiskResponse } = await import("../commands/risk");
    const r = risk({ criticality: "high" });
    expect(resultOf(r, "RSK-003")?.status).toBe("violated");
    const result = planRiskResponse(r, "reduce", "", "user-a", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("risk_critical_without_response");
  });
});

describe("déterminisme, non-mutation, ordre stable", () => {
  it("résultats identiques sur deux appels", () => {
    const r = risk({ criticality: "high" });
    expect(evaluateRiskRules(r, { now: NOW })).toEqual(evaluateRiskRules(r, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const r = risk({ criticality: "high" });
    const snapshot = { ...r };
    evaluateRiskRules(r, { now: NOW });
    expect(r).toEqual(snapshot);
  });

  it("ordre stable", () => {
    expect(evaluateRiskRules(risk(), { now: NOW }).map((x) => x.ruleId)).toEqual(["RSK-002", "RSK-003", "RSK-004"]);
  });
});
