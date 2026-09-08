import { describe, expect, it } from "vitest";
import { formatIsoWeek, getIsoWeekday } from "../calendar/iso-week";
import type { Action, ActionStatus } from "./types";
import { cycleStatus, moveAction } from "./move-action";

function baseAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Investiguer les droits d'accès",
    status: "todo",
    priority: "normal",
    itemType: "task",
    phaseId: "atelier",
    schedule: { granularity: "day", value: "2026-09-09" }, // mercredi
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("moveAction — axe schedule", () => {
  it("jour vers autre semaine : conserve le jour de semaine", () => {
    const action = baseAction();
    const originalWeekday = getIsoWeekday((action.schedule as { value: string }).value);
    const moved = moveAction(action, { axis: "schedule", to: { kind: "week", targetWeek: "2026-W40" } });
    expect(moved.schedule?.granularity).toBe("day");
    const movedValue = (moved.schedule as { value: string }).value;
    expect(getIsoWeekday(movedValue)).toBe(originalWeekday);
    expect(formatIsoWeek(movedValue)).toBe("2026-W40");
  });

  it("semaine vers autre semaine : remplace la valeur ISO", () => {
    const action = baseAction({ schedule: { granularity: "week", value: "2026-W37" } });
    const moved = moveAction(action, { axis: "schedule", to: { kind: "week", targetWeek: "2026-W40" } });
    expect(moved.schedule).toEqual({ granularity: "week", value: "2026-W40" });
  });

  it("mois vers semaine sans confirmation : rejeté", () => {
    const action = baseAction({ schedule: { granularity: "month", value: "2026-09" } });
    expect(() => moveAction(action, { axis: "schedule", to: { kind: "week", targetWeek: "2026-W40" } })).toThrow();
  });

  it("mois vers semaine avec confirmation : change la granularité", () => {
    const action = baseAction({ schedule: { granularity: "month", value: "2026-09" } });
    const moved = moveAction(action, {
      axis: "schedule",
      to: { kind: "week", targetWeek: "2026-W40", confirmed: true },
    });
    expect(moved.schedule).toEqual({ granularity: "week", value: "2026-W40" });
  });

  it("déplacement de schedule ne modifie ni phase ni statut", () => {
    const action = baseAction({ status: "waiting", phaseId: "realisations" });
    const moved = moveAction(action, { axis: "schedule", to: { kind: "week", targetWeek: "2026-W40" } });
    expect(moved.status).toBe(action.status);
    expect(moved.phaseId).toBe(action.phaseId);
  });
});

describe("moveAction — axe phase", () => {
  it("ne modifie jamais calendrier ou statut", () => {
    const action = baseAction({ status: "doing" });
    const moved = moveAction(action, { axis: "phase", phaseId: "validations" });
    expect(moved.phaseId).toBe("validations");
    expect(moved.schedule).toEqual(action.schedule);
    expect(moved.status).toBe(action.status);
  });
});

describe("moveAction — axe status", () => {
  it("ne modifie jamais phase ou calendrier", () => {
    const action = baseAction({ phaseId: "ateliers" });
    const moved = moveAction(action, { axis: "status", status: "done" }, "2026-09-10T00:00:00.000Z");
    expect(moved.status).toBe("done");
    expect(moved.completedAt).toBe("2026-09-10T00:00:00.000Z");
    expect(moved.phaseId).toBe(action.phaseId);
    expect(moved.schedule).toEqual(action.schedule);
  });

  it("efface completedAt si le statut redevient différent de done", () => {
    const action = baseAction({ status: "done", completedAt: "2026-09-05T00:00:00.000Z" });
    const moved = moveAction(action, { axis: "status", status: "doing" });
    expect(moved.completedAt).toBeUndefined();
  });
});

describe("cycleStatus — cycle rapide 1-clic", () => {
  it.each<[ActionStatus, ActionStatus]>([
    ["todo", "doing"],
    ["doing", "done"],
    ["done", "todo"],
    ["waiting", "todo"],
  ])("%s → %s", (current, expected) => {
    expect(cycleStatus(current)).toBe(expected);
  });
});
