import { describe, expect, it } from "vitest";
import type { Action } from "./types";
import { setAssignees } from "./set-assignees";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Action test",
    itemType: "task",
    priority: "normal",
    status: "waiting",
    schedule: { granularity: "none" },
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("setAssignees", () => {
  it("remplace la liste d'assignés et met à jour updatedAt", () => {
    const result = setAssignees(action(), ["m1", "m2"], "2026-09-11T00:00:00.000Z");
    expect(result.assigneeIds).toEqual(["m1", "m2"]);
    expect(result.updatedAt).toBe("2026-09-11T00:00:00.000Z");
  });

  it("accepte une liste vide (non assigné)", () => {
    const result = setAssignees(action({ assigneeIds: ["m1"] }), []);
    expect(result.assigneeIds).toEqual([]);
  });

  it("ne modifie pas les autres champs", () => {
    const result = setAssignees(action(), ["m1"]);
    expect(result.title).toBe("Action test");
    expect(result.status).toBe("waiting");
  });
});
