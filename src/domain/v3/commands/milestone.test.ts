import { describe, expect, it } from "vitest";
import { createMilestone, setMilestoneCriteria, submitMilestoneForReview, acceptMilestone, refuseMilestone } from "./milestone";
import type { Milestone } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseMilestone(overrides: Partial<Milestone> = {}): Milestone {
  const created = createMilestone({ id: "m1", projectId: "p1", observableResult: "Design validé", targetDate: NOW, now: NOW });
  if (!created.ok) throw new Error("fixture invalide");
  return { ...created.state, ...overrides };
}

describe("submitMilestoneForReview — JAL-001", () => {
  it("refuse sans critères d'acceptation", () => {
    const result = submitMilestoneForReview(baseMilestone({ acceptanceCriteria: [] }), NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("milestone_missing_criteria");
  });

  it("accepte avec critères, émet milestone.ready_for_review", () => {
    const withCriteria = setMilestoneCriteria(baseMilestone(), [{ description: "Maquettes validées par le sponsor", satisfied: true }], NOW);
    if (!withCriteria.ok) throw new Error("setup");
    const result = submitMilestoneForReview(withCriteria.state, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("ready_for_review");
    expect(result.events).toEqual([{ type: "milestone.ready_for_review", occurredAt: NOW, projectId: "p1", payload: { milestoneId: "m1" } }]);
  });
});

describe("acceptMilestone — JAL-002", () => {
  it("refuse sans preuve", () => {
    const milestone = baseMilestone({ status: "ready_for_review", evidenceIds: [] });
    const result = acceptMilestone(milestone, "user-a", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("milestone_missing_evidence");
  });

  it("accepte avec preuve, émet milestone.accepted", () => {
    const milestone = baseMilestone({ status: "ready_for_review", evidenceIds: ["ev1"] });
    const result = acceptMilestone(milestone, "user-a", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("accepted");
    expect(result.state.approverId).toBe("user-a");
    expect(result.events).toEqual([{ type: "milestone.accepted", occurredAt: NOW, projectId: "p1", payload: { milestoneId: "m1" } }]);
  });

  it("refuse d'accepter un jalon non prêt pour contrôle", () => {
    const milestone = baseMilestone({ status: "planned", evidenceIds: ["ev1"] });
    expect(acceptMilestone(milestone, "user-a", NOW).ok).toBe(false);
  });
});

describe("refuseMilestone puis nouvelle soumission", () => {
  it("refused -> ready_for_review reste possible (nouvelle tentative après correction)", () => {
    const milestone = baseMilestone({ status: "ready_for_review", acceptanceCriteria: [{ description: "x", satisfied: false }] });
    const refused = refuseMilestone(milestone, NOW);
    expect(refused.ok).toBe(true);
    if (!refused.ok) return;
    expect(refused.state.status).toBe("refused");
    expect(refused.events).toEqual([{ type: "milestone.refused", occurredAt: NOW, projectId: "p1", payload: { milestoneId: "m1" } }]);

    const resubmitted = submitMilestoneForReview(refused.state, NOW);
    expect(resubmitted.ok).toBe(true);
  });
});
