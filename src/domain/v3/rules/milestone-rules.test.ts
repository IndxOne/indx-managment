import { describe, expect, it } from "vitest";
import type { Milestone } from "../types";
import { evaluateMilestoneRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "m1",
    projectId: "p1",
    observableResult: "Design validé",
    targetDate: "2026-10-01T00:00:00.000Z",
    dependencyIds: [],
    acceptanceCriteria: [],
    evidenceIds: [],
    status: "planned",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function resultOf(m: Milestone, ruleId: string, now = NOW) {
  return evaluateMilestoneRules(m, { now }).find((r) => r.ruleId === ruleId);
}

describe("JAL-001 — critères manquants", () => {
  it("violée sans critères en planned", () => {
    expect(resultOf(milestone(), "JAL-001")?.status).toBe("violated");
  });

  it("satisfaite avec critères", () => {
    const m = milestone({ acceptanceCriteria: [{ description: "x", satisfied: false }] });
    expect(resultOf(m, "JAL-001")?.status).toBe("satisfied");
  });

  it("non applicable au-delà de planned", () => {
    expect(resultOf(milestone({ status: "ready_for_review" }), "JAL-001")?.status).toBe("not_applicable");
  });
});

describe("JAL-002 — preuve manquante", () => {
  it("non applicable si pas ready_for_review", () => {
    expect(resultOf(milestone({ status: "planned" }), "JAL-002")?.status).toBe("not_applicable");
  });

  it("violée sans preuve en ready_for_review", () => {
    expect(resultOf(milestone({ status: "ready_for_review" }), "JAL-002")?.status).toBe("violated");
  });

  it("satisfaite avec preuve", () => {
    const m = milestone({ status: "ready_for_review", evidenceIds: ["ev1"] });
    expect(resultOf(m, "JAL-002")?.status).toBe("satisfied");
  });
});

describe("JAL-003 — jalon en retard", () => {
  it("violée si targetDate dépassée en planned", () => {
    const m = milestone({ targetDate: "2026-09-19T00:00:00.000Z" });
    expect(resultOf(m, "JAL-003", NOW)?.status).toBe("violated");
  });

  it("cas limite : targetDate === now n'est pas en retard", () => {
    const m = milestone({ targetDate: NOW });
    expect(resultOf(m, "JAL-003", NOW)?.status).toBe("satisfied");
  });

  it("non applicable si accepted/refused", () => {
    expect(resultOf(milestone({ status: "accepted", targetDate: "2020-01-01T00:00:00.000Z" }), "JAL-003")?.status).toBe("not_applicable");
  });
});

describe("JAL-004 — resoumission requise", () => {
  it("non applicable si pas refused", () => {
    expect(resultOf(milestone({ status: "planned" }), "JAL-004")?.status).toBe("not_applicable");
  });

  it("violée si refused", () => {
    expect(resultOf(milestone({ status: "refused" }), "JAL-004")?.status).toBe("violated");
  });
});

describe("cohérence règle <-> commande", () => {
  it("JAL-001 violée => submitMilestoneForReview échoue avec milestone_missing_criteria", async () => {
    const { submitMilestoneForReview } = await import("../commands/milestone");
    const m = milestone();
    expect(resultOf(m, "JAL-001")?.status).toBe("violated");
    const result = submitMilestoneForReview(m, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("milestone_missing_criteria");
  });

  it("JAL-002 violée => acceptMilestone échoue avec milestone_missing_evidence", async () => {
    const { acceptMilestone } = await import("../commands/milestone");
    const m = milestone({ status: "ready_for_review" });
    expect(resultOf(m, "JAL-002")?.status).toBe("violated");
    const result = acceptMilestone(m, "user-a", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("milestone_missing_evidence");
  });
});

describe("déterminisme, non-mutation, ordre stable", () => {
  it("résultats identiques sur deux appels", () => {
    const m = milestone();
    expect(evaluateMilestoneRules(m, { now: NOW })).toEqual(evaluateMilestoneRules(m, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const m = milestone();
    const snapshot = { ...m };
    evaluateMilestoneRules(m, { now: NOW });
    expect(m).toEqual(snapshot);
  });

  it("ordre stable", () => {
    expect(evaluateMilestoneRules(milestone(), { now: NOW }).map((r) => r.ruleId)).toEqual(["JAL-001", "JAL-002", "JAL-003", "JAL-004"]);
  });
});
