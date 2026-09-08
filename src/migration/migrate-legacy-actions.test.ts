import { describe, expect, it } from "vitest";
import { migrateLegacyAction, migrateLegacyActions, type LegacyAction } from "./migrate-legacy-actions";

function legacy(overrides: Partial<LegacyAction> = {}): LegacyAction {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Mettre à jour le questionnaire de chiffrage",
    status: "todo",
    priority: "normal",
    itemType: "task",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("migrateLegacyAction", () => {
  it("migration d'une action sans planification -> schedule none", () => {
    const action = migrateLegacyAction(legacy());
    expect(action.schedule).toEqual({ granularity: "none" });
    expect(action.assigneeIds).toEqual([]);
    expect(action.tags).toEqual([]);
  });

  it("dueDate devient un schedule day", () => {
    const action = migrateLegacyAction(legacy({ dueDate: "2026-09-11" }));
    expect(action.schedule).toEqual({ granularity: "day", value: "2026-09-11" });
  });

  it("week devient un schedule week", () => {
    const action = migrateLegacyAction(legacy({ week: "2026-W37" }));
    expect(action.schedule).toEqual({ granularity: "week", value: "2026-W37" });
  });

  it("month devient un schedule month", () => {
    const action = migrateLegacyAction(legacy({ month: "2026-09" }));
    expect(action.schedule).toEqual({ granularity: "month", value: "2026-09" });
  });

  it("champs contradictoires : dueDate prime sur week et month", () => {
    const action = migrateLegacyAction(
      legacy({ dueDate: "2026-09-11", week: "2026-W40", month: "2026-10" })
    );
    expect(action.schedule).toEqual({ granularity: "day", value: "2026-09-11" });
  });

  it("rejette une date invalide", () => {
    expect(() => migrateLegacyAction(legacy({ dueDate: "2026-02-30" }))).toThrow();
  });

  it("rejette une semaine ISO invalide", () => {
    expect(() => migrateLegacyAction(legacy({ week: "2026-W60" }))).toThrow();
  });

  it("rejette une action sans titre", () => {
    expect(() => migrateLegacyAction(legacy({ title: "" }))).toThrow();
  });
});

describe("migrateLegacyActions", () => {
  it("migre un lot d'actions sans perte", () => {
    const actions = migrateLegacyActions([
      legacy({ id: "a1", dueDate: "2026-09-09" }),
      legacy({ id: "a2", week: "2026-W37" }),
      legacy({ id: "a3" }),
    ]);
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});
