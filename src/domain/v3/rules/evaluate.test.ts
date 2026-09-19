import { describe, expect, it } from "vitest";
import type { WorkItem, Risk } from "../types";
import { evaluateRules, ruleResultsToEvents } from "./evaluate";

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

describe("evaluateRules — dispatch typé par targetType", () => {
  it("evaluateRules.work_item évalue un WorkItem", () => {
    const results = evaluateRules.work_item(workItem(), { now: NOW });
    expect(results.length).toBe(4);
    expect(results.every((r) => r.targetType === "work_item")).toBe(true);
  });

  it("evaluateRules.risk évalue un Risk", () => {
    const results = evaluateRules.risk(risk(), { now: NOW });
    expect(results.length).toBe(3);
    expect(results.every((r) => r.targetType === "risk")).toBe(true);
  });

  // Impossible d'écrire evaluateRules.work_item(unRisk, ctx) ici : refusé à
  // la compilation (§3 de la gate), pas testable à l'exécution — c'est
  // précisément la garantie recherchée.
});

describe("ruleResultsToEvents", () => {
  it("ne produit un événement que pour les résultats violated", () => {
    const item = workItem({ status: "blocked" }); // ACT-001 violated, ACT-002 violated, ACT-004 violated, ACT-005 not_applicable
    const results = evaluateRules.work_item(item, { now: NOW });
    const violatedCount = results.filter((r) => r.status === "violated").length;
    const events = ruleResultsToEvents(results, "p1", NOW);
    expect(events.length).toBe(violatedCount);
    expect(events.every((e) => e.type === "rule.executed")).toBe(true);
  });

  it("aucun événement pour satisfied ou not_applicable", () => {
    const item = workItem({ status: "done" }); // toutes les règles ACT sont not_applicable sur un statut terminal
    const results = evaluateRules.work_item(item, { now: NOW });
    expect(results.every((r) => r.status === "not_applicable")).toBe(true);
    expect(ruleResultsToEvents(results, "p1", NOW)).toEqual([]);
  });

  it("le payload de l'événement reflète fidèlement le RuleResult source", () => {
    const item = workItem({ status: "to_scope" }); // ACT-001 violated
    const results = evaluateRules.work_item(item, { now: NOW });
    const events = ruleResultsToEvents(results, "p1", NOW);
    const act001 = events.find((e) => e.type === "rule.executed" && e.payload.ruleId === "ACT-001");
    expect(act001).toEqual({
      type: "rule.executed",
      occurredAt: NOW,
      projectId: "p1",
      payload: { ruleId: "ACT-001", targetType: "work_item", targetId: "wi1", severity: "blocking", status: "violated" },
    });
  });

  it("n'émet jamais d'événement pendant evaluateXRules() lui-même (fonctions séparées)", () => {
    const item = workItem();
    const results = evaluateRules.work_item(item, { now: NOW });
    expect(results.every((r) => !("type" in r))).toBe(true);
  });
});
