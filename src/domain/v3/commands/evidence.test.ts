import { describe, expect, it } from "vitest";
import { attachEvidence, validateEvidence } from "./evidence";
import type { Evidence } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

describe("attachEvidence", () => {
  it("refuse sans description", () => {
    const result = attachEvidence({
      id: "ev1",
      projectId: "p1",
      provedEntityType: "milestone",
      provedEntityId: "m1",
      type: "document",
      description: "",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("evidence_missing_description");
  });

  it("accepte avec description, à l'état pending, émet evidence.attached", () => {
    const result = attachEvidence({
      id: "ev1",
      projectId: "p1",
      provedEntityType: "milestone",
      provedEntityId: "m1",
      type: "document",
      description: "Compte-rendu de recette signé",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.validationStatus).toBe("pending");
    expect(result.events).toEqual([{ type: "evidence.attached", occurredAt: NOW, projectId: "p1", payload: { evidenceId: "ev1", provedEntityId: "m1" } }]);
  });
});

describe("validateEvidence", () => {
  const evidence: Evidence = {
    id: "ev1",
    projectId: "p1",
    provedEntityType: "milestone",
    provedEntityId: "m1",
    type: "document",
    description: "Compte-rendu de recette signé",
    validationStatus: "pending",
    createdAt: NOW,
  };

  it("accepted=true -> validated", () => {
    const result = validateEvidence(evidence, true, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.validationStatus).toBe("validated");
    expect(result.events).toEqual([{ type: "evidence.validated", occurredAt: NOW, projectId: "p1", payload: { evidenceId: "ev1" } }]);
  });

  it("accepted=false -> rejected", () => {
    const result = validateEvidence(evidence, false, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.validationStatus).toBe("rejected");
  });
});
