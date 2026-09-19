import { describe, expect, it } from "vitest";
import type { WorkItem } from "../types";
import { evaluateWorkItemRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi1",
    projectId: "p1",
    type: "task",
    title: "Configurer VPN",
    status: "to_scope",
    priority: "normal",
    acceptanceCriteria: [],
    dependencyIds: [],
    evidenceIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function resultOf(item: WorkItem, ruleId: string, now = NOW) {
  return evaluateWorkItemRules(item, { now }).find((r) => r.ruleId === ruleId);
}

describe("ACT-001 — responsable manquant", () => {
  it("violée sans responsable sur un statut non terminal", () => {
    expect(resultOf(workItem({ status: "to_scope" }), "ACT-001")?.status).toBe("violated");
  });

  it("satisfaite avec responsable", () => {
    expect(resultOf(workItem({ status: "to_scope", responsibleId: "user-a" }), "ACT-001")?.status).toBe("satisfied");
  });

  it("non applicable sur un statut terminal (done/cancelled)", () => {
    expect(resultOf(workItem({ status: "done" }), "ACT-001")?.status).toBe("not_applicable");
    expect(resultOf(workItem({ status: "cancelled" }), "ACT-001")?.status).toBe("not_applicable");
  });
});

describe("ACT-002 — échéance ou condition de sortie manquante", () => {
  it("violée sans dueDate ni exitCondition", () => {
    expect(resultOf(workItem(), "ACT-002")?.status).toBe("violated");
  });

  it("satisfaite avec dueDate seule", () => {
    expect(resultOf(workItem({ dueDate: NOW }), "ACT-002")?.status).toBe("satisfied");
  });

  it("satisfaite avec exitCondition seule", () => {
    expect(resultOf(workItem({ exitCondition: "Tests validés" }), "ACT-002")?.status).toBe("satisfied");
  });
});

describe("ACT-004 — motif de blocage manquant", () => {
  it("non applicable si le statut n'est pas blocked", () => {
    expect(resultOf(workItem({ status: "in_progress" }), "ACT-004")?.status).toBe("not_applicable");
  });

  it("violée si bloqué sans motif", () => {
    expect(resultOf(workItem({ status: "blocked" }), "ACT-004")?.status).toBe("violated");
  });

  it("satisfaite si bloqué avec motif", () => {
    expect(resultOf(workItem({ status: "blocked", blockedReason: "attente accès" }), "ACT-004")?.status).toBe("satisfied");
  });
});

describe("ACT-005 — échéance dépassée", () => {
  it("non applicable sans dueDate", () => {
    expect(resultOf(workItem(), "ACT-005")?.status).toBe("not_applicable");
  });

  it("violée si dueDate strictement antérieure à now", () => {
    const item = workItem({ dueDate: "2026-09-19T00:00:00.000Z" });
    expect(resultOf(item, "ACT-005", NOW)?.status).toBe("violated");
  });

  it("cas limite : dueDate === now n'est pas dépassée", () => {
    const item = workItem({ dueDate: NOW });
    expect(resultOf(item, "ACT-005", NOW)?.status).toBe("satisfied");
  });

  it("non applicable sur un statut terminal même avec dueDate dépassée", () => {
    const item = workItem({ status: "done", dueDate: "2026-01-01T00:00:00.000Z" });
    expect(resultOf(item, "ACT-005")?.status).toBe("not_applicable");
  });
});

describe("déterminisme et non-mutation", () => {
  it("deux évaluations successives produisent le même résultat", () => {
    const item = workItem({ status: "blocked" });
    expect(evaluateWorkItemRules(item, { now: NOW })).toEqual(evaluateWorkItemRules(item, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const item = workItem({ status: "blocked" });
    const snapshot = { ...item };
    evaluateWorkItemRules(item, { now: NOW });
    expect(item).toEqual(snapshot);
  });

  it("ordre des résultats stable (ordre de déclaration du registre)", () => {
    const item = workItem();
    const results = evaluateWorkItemRules(item, { now: NOW });
    expect(results.map((r) => r.ruleId)).toEqual(["ACT-001", "ACT-002", "ACT-004", "ACT-005"]);
  });
});
