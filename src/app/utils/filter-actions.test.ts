import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import { applyFilters, EMPTY_FILTERS, hasActiveFilters } from "./filter-actions";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Test",
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applyFilters", () => {
  it("sans filtre actif, retourne toutes les actions", () => {
    const actions = [action({ id: "a1" }), action({ id: "a2", status: "done" })];
    expect(applyFilters(actions, EMPTY_FILTERS)).toEqual(actions);
  });

  it("filtre par statut", () => {
    const actions = [action({ id: "a1", status: "todo" }), action({ id: "a2", status: "done" })];
    const result = applyFilters(actions, { ...EMPTY_FILTERS, statuses: new Set(["done"]) });
    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });

  it("combine plusieurs dimensions en ET", () => {
    const actions = [
      action({ id: "a1", status: "todo", priority: "high" }),
      action({ id: "a2", status: "todo", priority: "low" }),
      action({ id: "a3", status: "done", priority: "high" }),
    ];
    const result = applyFilters(actions, {
      ...EMPTY_FILTERS,
      statuses: new Set(["todo"]),
      priorities: new Set(["high"]),
    });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("filtre sans résultat renvoie un tableau vide", () => {
    const actions = [action({ priority: "normal" })];
    const result = applyFilters(actions, { ...EMPTY_FILTERS, priorities: new Set(["high"]) });
    expect(result).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("détecte un filtre actif sur n'importe quelle dimension", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, itemTypes: new Set(["incident"]) })).toBe(true);
  });

  it("détecte le filtre responsable (Lot 8B)", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, assignee: "m1" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, assignee: "unassigned" })).toBe(true);
  });
});

describe("applyFilters — responsable (Lot 8B)", () => {
  it("filtre par id de membre assigné", () => {
    const actions = [
      action({ id: "a1", assigneeIds: ["m1"] }),
      action({ id: "a2", assigneeIds: ["m2"] }),
      action({ id: "a3", assigneeIds: ["m1", "m2"] }),
    ];
    const result = applyFilters(actions, { ...EMPTY_FILTERS, assignee: "m1" });
    expect(result.map((a) => a.id)).toEqual(["a1", "a3"]);
  });

  it("« unassigned » ne garde que les actions sans aucun responsable", () => {
    const actions = [action({ id: "a1", assigneeIds: [] }), action({ id: "a2", assigneeIds: ["m1"] })];
    const result = applyFilters(actions, { ...EMPTY_FILTERS, assignee: "unassigned" });
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });
});
