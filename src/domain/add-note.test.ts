import { describe, expect, it } from "vitest";
import { addNote } from "./add-note";
import type { Action } from "./types";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Relancer le prestataire",
    status: "waiting",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("addNote", () => {
  it("ajoute la note à la fin du journal, rogne le texte", () => {
    const updated = addNote(action(), "n1", "  Relance envoyée  ", "2026-09-08T00:00:00.000Z");
    expect(updated.notes).toEqual([{ id: "n1", text: "Relance envoyée", createdAt: "2026-09-08T00:00:00.000Z" }]);
    expect(updated.updatedAt).toBe("2026-09-08T00:00:00.000Z");
  });

  it("empile les notes existantes sans les modifier", () => {
    const withOne = addNote(action(), "n1", "Première note", "2026-09-08T00:00:00.000Z");
    const withTwo = addNote(withOne, "n2", "Deuxième note", "2026-09-09T00:00:00.000Z");
    expect(withTwo.notes).toHaveLength(2);
    expect(withTwo.notes?.[0]).toEqual({ id: "n1", text: "Première note", createdAt: "2026-09-08T00:00:00.000Z" });
    expect(withTwo.notes?.[1]).toEqual({ id: "n2", text: "Deuxième note", createdAt: "2026-09-09T00:00:00.000Z" });
  });

  it("rejette un texte vide ou blanc", () => {
    expect(() => addNote(action(), "n1", "   ")).toThrow();
  });

  it("ne modifie jamais schedule, phase ou statut", () => {
    const original = action({ status: "doing", phaseId: "ateliers" });
    const updated = addNote(original, "n1", "Note");
    expect(updated.status).toBe(original.status);
    expect(updated.phaseId).toBe(original.phaseId);
    expect(updated.schedule).toBe(original.schedule);
  });
});
