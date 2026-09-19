import { describe, expect, it } from "vitest";
import { createWorkItem, assignWorkItem, transitionWorkItem, setBlockedReason } from "./work-item";
import type { WorkItem } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseItem(overrides: Partial<WorkItem> = {}): WorkItem {
  const created = createWorkItem({
    id: "wi1",
    projectId: "p1",
    type: "task",
    title: "Configurer le VPN",
    priority: "normal",
    now: NOW,
  });
  if (!created.ok) throw new Error("fixture invalide");
  return { ...created.state, ...overrides };
}

describe("createWorkItem", () => {
  it("crée un WorkItem à l'état to_scope, sans événement (non listé au cahier)", () => {
    const result = createWorkItem({ id: "wi1", projectId: "p1", type: "task", title: "X", priority: "normal", now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("to_scope");
    expect(result.events).toEqual([]);
  });
});

describe("assignWorkItem", () => {
  it("assigne un responsable et émet work_item.assigned", () => {
    const item = baseItem();
    const result = assignWorkItem(item, "user-a", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.responsibleId).toBe("user-a");
    expect(result.events).toEqual([
      { type: "work_item.assigned", occurredAt: NOW, projectId: "p1", payload: { workItemId: "wi1", responsibleId: "user-a" } },
    ]);
  });
});

describe("transitionWorkItem — table de transitions", () => {
  const cases: Array<[from: WorkItem["status"], to: WorkItem["status"], allowed: boolean]> = [
    ["to_scope", "ready", true],
    ["ready", "in_progress", true],
    ["in_progress", "blocked", true],
    ["in_progress", "validation", true],
    ["blocked", "in_progress", true],
    ["validation", "done", true],
    ["validation", "in_progress", true],
    ["done", "in_progress", false],
    ["cancelled", "ready", false],
    ["to_scope", "done", false],
  ];

  for (const [from, to, allowed] of cases) {
    it(`${from} -> ${to} : ${allowed ? "autorisé" : "refusé"}`, () => {
      const item = baseItem({ status: from, responsibleId: "user-a", dueDate: NOW, blockedReason: "attente fournisseur" });
      const result = transitionWorkItem(item, to, NOW);
      expect(result.ok).toBe(allowed);
      if (!allowed) {
        expect(!result.ok && result.error.code).toBe("work_item_invalid_transition");
      }
    });
  }

  it("ACT-001 : refuse ready sans responsable", () => {
    const item = baseItem({ status: "to_scope", responsibleId: undefined, dueDate: NOW });
    const result = transitionWorkItem(item, "ready", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("work_item_missing_responsible");
  });

  it("ACT-002 : refuse ready sans échéance ni condition de sortie", () => {
    const item = baseItem({ status: "to_scope", responsibleId: "user-a", dueDate: undefined, exitCondition: undefined });
    const result = transitionWorkItem(item, "ready", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("work_item_missing_exit_condition");
  });

  it("ready accepté avec condition de sortie seule (pas d'échéance)", () => {
    const item = baseItem({ status: "to_scope", responsibleId: "user-a", dueDate: undefined, exitCondition: "Validation client reçue" });
    const result = transitionWorkItem(item, "ready", NOW);
    expect(result.ok).toBe(true);
  });

  it("ACT-004 : refuse blocked sans motif", () => {
    const item = baseItem({ status: "in_progress", blockedReason: undefined });
    const result = transitionWorkItem(item, "blocked", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("work_item_blocked_without_reason");
  });

  it("blocked avec motif posé via setBlockedReason produit work_item.blocked", () => {
    const item = baseItem({ status: "in_progress" });
    const withReason = setBlockedReason(item, "Attente accès fournisseur", "Relancer le fournisseur", NOW);
    expect(withReason.ok).toBe(true);
    if (!withReason.ok) return;
    const result = transitionWorkItem(withReason.state, "blocked", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events).toEqual([
      { type: "work_item.transitioned", occurredAt: NOW, projectId: "p1", payload: { workItemId: "wi1", from: "in_progress", to: "blocked" } },
      { type: "work_item.blocked", occurredAt: NOW, projectId: "p1", payload: { workItemId: "wi1", reason: "Attente accès fournisseur" } },
    ]);
  });
});
