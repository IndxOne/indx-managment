import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import { computeWorkspaceSummary } from "./workspace-summary";

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

describe("computeWorkspaceSummary", () => {
  const now = new Date("2026-09-08T09:00:00Z"); // mardi

  it("exclut les actions terminées du compte pertinent, mais les compte à part", () => {
    const summary = computeWorkspaceSummary(
      [action({ id: "a1", status: "done" }), action({ id: "a2", status: "todo" })],
      "Europe/Paris",
      now
    );
    expect(summary.relevantActionsCount).toBe(1);
    expect(summary.doneCount).toBe(1);
  });

  it("aucune échéance -> nextDueLabel null", () => {
    const summary = computeWorkspaceSummary([action()], "Europe/Paris", now);
    expect(summary.nextDueLabel).toBeNull();
  });

  it("retient l'échéance la plus proche parmi plusieurs", () => {
    const summary = computeWorkspaceSummary(
      [
        action({ id: "a1", schedule: { granularity: "day", value: "2026-09-10" } }),
        action({ id: "a2", schedule: { granularity: "day", value: "2026-09-08" } }),
      ],
      "Europe/Paris",
      now
    );
    expect(summary.nextDueLabel).toBe("Aujourd'hui");
  });
});
