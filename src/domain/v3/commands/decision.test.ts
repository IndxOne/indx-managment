import { describe, expect, it } from "vitest";
import { createDecision, markDecisionReady, recordDecision, applyDecision, verifyDecision } from "./decision";
import type { Decision } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseDecision(overrides: Partial<Decision> = {}): Decision {
  const created = createDecision({ id: "d1", projectId: "p1", question: "Quel prestataire ?", context: "3 devis reçus", now: NOW });
  if (!created.ok) throw new Error("fixture invalide");
  return { ...created.state, ...overrides };
}

describe("createDecision", () => {
  it("crée une décision à l'état to_prepare", () => {
    const result = createDecision({ id: "d1", projectId: "p1", question: "Q", context: "C", now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("to_prepare");
  });
});

describe("markDecisionReady — DEC-001", () => {
  it("refuse sans décideur", () => {
    const decision = baseDecision({ deciderId: undefined, dueDate: NOW });
    const result = markDecisionReady(decision, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("decision_missing_decider");
  });

  it("refuse sans échéance", () => {
    const decision = baseDecision({ deciderId: "user-a", dueDate: undefined });
    const result = markDecisionReady(decision, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("decision_missing_due_date");
  });

  it("accepte avec décideur et échéance, émet decision.requested", () => {
    const decision = baseDecision({ deciderId: "user-a", dueDate: NOW });
    const result = markDecisionReady(decision, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("ready");
    expect(result.events).toEqual([{ type: "decision.requested", occurredAt: NOW, projectId: "p1", payload: { decisionId: "d1" } }]);
  });
});

describe("cycle de vie linéaire — to_prepare -> ready -> decided -> applied -> verified", () => {
  it("chaque étape refuse de sauter la précédente", () => {
    const decision = baseDecision();
    expect(recordDecision(decision, "Prestataire X retenu", NOW).ok).toBe(false);
    expect(applyDecision(decision, NOW).ok).toBe(false);
    expect(verifyDecision(decision, NOW).ok).toBe(false);
  });

  it("chaîne complète produit les 4 événements attendus", () => {
    const ready = markDecisionReady(baseDecision({ deciderId: "user-a", dueDate: NOW }), NOW);
    if (!ready.ok) throw new Error("setup");
    const decided = recordDecision(ready.state, "Prestataire X retenu", NOW);
    if (!decided.ok) throw new Error("setup");
    expect(decided.state.outcome).toBe("Prestataire X retenu");
    expect(decided.events.map((e) => e.type)).toEqual(["decision.recorded"]);

    const applied = applyDecision(decided.state, NOW);
    if (!applied.ok) throw new Error("setup");
    expect(applied.events.map((e) => e.type)).toEqual(["decision.applied"]);

    const verified = verifyDecision(applied.state, NOW);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.events.map((e) => e.type)).toEqual(["decision.verified"]);
    expect(verified.state.status).toBe("verified");
  });
});
