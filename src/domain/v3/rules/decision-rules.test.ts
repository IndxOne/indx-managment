import { describe, expect, it } from "vitest";
import type { Decision } from "../types";
import { evaluateDecisionRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function resultOf(d: Decision, ruleId: string, now = NOW) {
  return evaluateDecisionRules(d, { now }).find((r) => r.ruleId === ruleId);
}

describe("DEC-001 — décideur manquant", () => {
  it("violée sans décideur en to_prepare", () => {
    expect(resultOf(decision(), "DEC-001")?.status).toBe("violated");
  });

  it("satisfaite avec décideur", () => {
    expect(resultOf(decision({ deciderId: "user-a" }), "DEC-001")?.status).toBe("satisfied");
  });

  it("non applicable au-delà de to_prepare", () => {
    expect(resultOf(decision({ status: "ready", deciderId: "user-a", dueDate: NOW }), "DEC-001")?.status).toBe("not_applicable");
  });
});

describe("DEC-002 — échéance manquante", () => {
  it("violée sans dueDate en to_prepare", () => {
    expect(resultOf(decision(), "DEC-002")?.status).toBe("violated");
  });

  it("satisfaite avec dueDate", () => {
    expect(resultOf(decision({ dueDate: NOW }), "DEC-002")?.status).toBe("satisfied");
  });
});

describe("DEC-003 — décision en retard", () => {
  it("non applicable sans dueDate", () => {
    expect(resultOf(decision(), "DEC-003")?.status).toBe("not_applicable");
  });

  it("violée si dueDate dépassée en to_prepare", () => {
    const d = decision({ dueDate: "2026-09-19T00:00:00.000Z" });
    expect(resultOf(d, "DEC-003", NOW)?.status).toBe("violated");
  });

  it("cas limite : dueDate === now n'est pas en retard", () => {
    const d = decision({ dueDate: NOW });
    expect(resultOf(d, "DEC-003", NOW)?.status).toBe("satisfied");
  });

  it("non applicable au-delà de ready (décidée ou plus)", () => {
    const d = decision({ status: "decided", dueDate: "2020-01-01T00:00:00.000Z", outcome: "x", decidedAt: NOW });
    expect(resultOf(d, "DEC-003")?.status).toBe("not_applicable");
  });
});

describe("déterminisme, non-mutation, ordre stable", () => {
  it("résultats identiques sur deux appels", () => {
    const d = decision();
    expect(evaluateDecisionRules(d, { now: NOW })).toEqual(evaluateDecisionRules(d, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const d = decision();
    const snapshot = { ...d };
    evaluateDecisionRules(d, { now: NOW });
    expect(d).toEqual(snapshot);
  });

  it("ordre stable", () => {
    expect(evaluateDecisionRules(decision(), { now: NOW }).map((r) => r.ruleId)).toEqual(["DEC-001", "DEC-002", "DEC-003"]);
  });
});
