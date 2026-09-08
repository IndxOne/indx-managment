import { describe, expect, it } from "vitest";
import { editActionContent } from "./edit-action";
import type { Action } from "./types";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Titre initial",
    description: "Description initiale",
    status: "waiting",
    priority: "normal",
    itemType: "task",
    phaseId: "ateliers",
    schedule: { granularity: "day", value: "2026-09-09" },
    assigneeIds: [],
    tags: [],
    waitingSince: "2026-09-08T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("editActionContent", () => {
  it("met à jour uniquement les champs fournis", () => {
    const edited = editActionContent(action(), { priority: "high" }, "2026-09-10T00:00:00.000Z");
    expect(edited.priority).toBe("high");
    expect(edited.title).toBe("Titre initial");
    expect(edited.updatedAt).toBe("2026-09-10T00:00:00.000Z");
  });

  it("rogne le titre et rejette un titre vide", () => {
    const edited = editActionContent(action(), { title: "  Nouveau titre  " });
    expect(edited.title).toBe("Nouveau titre");
    expect(() => editActionContent(action(), { title: "   " })).toThrow();
  });

  it("ne modifie jamais schedule, phase, status ni la relance", () => {
    const original = action();
    const edited = editActionContent(original, { title: "Autre titre", itemType: "incident" });
    expect(edited.schedule).toEqual(original.schedule);
    expect(edited.phaseId).toBe(original.phaseId);
    expect(edited.status).toBe(original.status);
    expect(edited.waitingSince).toBe(original.waitingSince);
  });
});
