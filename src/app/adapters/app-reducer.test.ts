import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import type { RecurrenceRule } from "../../recurrence/recurrence-engine";
import { appReducer } from "./app-reducer";
import { EMPTY_STATE, type AppState } from "./store-context";

function rule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: "r1",
    workspaceId: "w1",
    frequency: "daily",
    interval: 1,
    startDate: "2026-09-08",
    template: { title: "Contrôle quotidien", priority: "normal", itemType: "task", assigneeIds: [], tags: [] },
    ...overrides,
  };
}

function stateWithWorkspace(): AppState {
  return { ...EMPTY_STATE, actionsByWorkspace: { w1: [] }, recurrenceRulesByWorkspace: { w1: [] } };
}

describe("appReducer — recurrence/create", () => {
  it("ajoute la règle et matérialise les occurrences de la fenêtre dans actionsByWorkspace", () => {
    const next = appReducer(stateWithWorkspace(), {
      type: "recurrence/create",
      rule: rule(),
      window: { start: "2026-09-08", end: "2026-09-10" },
    });

    expect(next.recurrenceRulesByWorkspace.w1).toEqual([rule()]);
    expect(next.actionsByWorkspace.w1).toHaveLength(3);
    expect(next.actionsByWorkspace.w1?.map((a) => a.schedule)).toEqual([
      { granularity: "day", value: "2026-09-08" },
      { granularity: "day", value: "2026-09-09" },
      { granularity: "day", value: "2026-09-10" },
    ]);
  });

  it("conserve les actions et règles déjà existantes du workspace", () => {
    const existingAction: Action = {
      id: "a0",
      workspaceId: "w1",
      title: "Action manuelle",
      status: "todo",
      priority: "normal",
      itemType: "task",
      assigneeIds: [],
      tags: [],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    const before: AppState = { ...stateWithWorkspace(), actionsByWorkspace: { w1: [existingAction] } };

    const next = appReducer(before, {
      type: "recurrence/create",
      rule: rule(),
      window: { start: "2026-09-08", end: "2026-09-08" },
    });

    expect(next.actionsByWorkspace.w1?.map((a) => a.id)).toEqual(["a0", "r1__2026-09-08"]);
  });
});

describe("appReducer — recurrence/delete", () => {
  it("retire la règle et les occurrences futures encore 'todo'", () => {
    const before: AppState = {
      ...stateWithWorkspace(),
      recurrenceRulesByWorkspace: { w1: [rule()] },
      actionsByWorkspace: {
        w1: [
          futureOccurrence("r1__2026-09-20", "2026-09-20", "todo"),
          futureOccurrence("r1__2026-09-21", "2026-09-21", "todo"),
        ],
      },
    };

    const next = appReducer(before, { type: "recurrence/delete", workspaceId: "w1", ruleId: "r1", today: "2026-09-08" });

    expect(next.recurrenceRulesByWorkspace.w1).toEqual([]);
    expect(next.actionsByWorkspace.w1).toEqual([]);
  });

  it("conserve les occurrences passées, en cours ou déjà modifiées (jamais de perte silencieuse)", () => {
    const before: AppState = {
      ...stateWithWorkspace(),
      recurrenceRulesByWorkspace: { w1: [rule()] },
      actionsByWorkspace: {
        w1: [
          futureOccurrence("r1__2026-09-01", "2026-09-01", "todo"), // passée
          futureOccurrence("r1__2026-09-20", "2026-09-20", "doing"), // déjà commencée
          futureOccurrence("r1__2026-09-21", "2026-09-21", "done"), // déjà terminée
          futureOccurrence("r1__2026-09-22", "2026-09-22", "todo"), // future non touchée -> supprimée
        ],
      },
    };

    const next = appReducer(before, { type: "recurrence/delete", workspaceId: "w1", ruleId: "r1", today: "2026-09-08" });

    expect(next.actionsByWorkspace.w1?.map((a) => a.id)).toEqual([
      "r1__2026-09-01",
      "r1__2026-09-20",
      "r1__2026-09-21",
    ]);
  });

  it("n'affecte pas les actions d'une autre règle ou sans récurrence", () => {
    const before: AppState = {
      ...stateWithWorkspace(),
      recurrenceRulesByWorkspace: { w1: [rule(), rule({ id: "r2" })] },
      actionsByWorkspace: {
        w1: [
          futureOccurrence("r2__2026-09-20", "2026-09-20", "todo", "r2"),
          { ...futureOccurrence("manual", "2026-09-20", "todo"), recurrenceRuleId: undefined },
        ],
      },
    };

    const next = appReducer(before, { type: "recurrence/delete", workspaceId: "w1", ruleId: "r1", today: "2026-09-08" });

    expect(next.recurrenceRulesByWorkspace.w1?.map((r) => r.id)).toEqual(["r2"]);
    expect(next.actionsByWorkspace.w1?.map((a) => a.id)).toEqual(["r2__2026-09-20", "manual"]);
  });
});

function futureOccurrence(
  id: string,
  dateValue: string,
  status: Action["status"],
  recurrenceRuleId = "r1"
): Action {
  return {
    id,
    workspaceId: "w1",
    title: "Contrôle quotidien",
    status,
    priority: "normal",
    itemType: "task",
    schedule: { granularity: "day", value: dateValue },
    assigneeIds: [],
    tags: [],
    recurrenceRuleId,
    createdAt: dateValue,
    updatedAt: dateValue,
  };
}
