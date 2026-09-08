import { describe, expect, it } from "vitest";
import { moveAction } from "../domain/move-action";
import type { Action } from "../domain/types";
import {
  disableWaitingReminder,
  isWaitingReminderDue,
  setWaitingReminder,
  triggerWaitingReminderIfDue,
} from "./waiting-reminder";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Investiguer les droits d'accès",
    status: "waiting",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    waitingSince: "2026-09-09T09:00:00.000Z",
    createdAt: "2026-09-09T09:00:00.000Z",
    updatedAt: "2026-09-09T09:00:00.000Z",
    ...overrides,
  };
}

describe("moveAction — gestion de waitingSince", () => {
  it("entrer en attente fixe waitingSince à l'instant du déplacement", () => {
    const todo = action({ status: "todo", waitingSince: undefined });
    const waiting = moveAction(todo, { axis: "status", status: "waiting" }, "2026-09-09T10:00:00.000Z");
    expect(waiting.waitingSince).toBe("2026-09-09T10:00:00.000Z");
  });

  it("sortir de l'attente efface waitingSince", () => {
    const waiting = action({ waitingSince: "2026-09-09T09:00:00.000Z" });
    const doing = moveAction(waiting, { axis: "status", status: "doing" });
    expect(doing.waitingSince).toBeUndefined();
  });

  it("rester en attente conserve waitingSince d'origine", () => {
    const waiting = action({ waitingSince: "2026-09-09T09:00:00.000Z" });
    const stillWaiting = moveAction(waiting, { axis: "status", status: "waiting" }, "2026-09-10T09:00:00.000Z");
    expect(stillWaiting.waitingSince).toBe("2026-09-09T09:00:00.000Z");
  });

  it("ne touche jamais au réglage de relance (axe indépendant)", () => {
    const withReminder = setWaitingReminder(action(), 3);
    const doing = moveAction(withReminder, { axis: "status", status: "doing" });
    expect(doing.waitingReminder).toEqual(withReminder.waitingReminder);
  });
});

describe("setWaitingReminder / disableWaitingReminder", () => {
  it("configure une relance active", () => {
    const withReminder = setWaitingReminder(action(), 3);
    expect(withReminder.waitingReminder).toEqual({ afterDays: 3, enabled: true, history: [] });
  });

  it("rejette un délai invalide", () => {
    expect(() => setWaitingReminder(action(), 0)).toThrow();
    expect(() => setWaitingReminder(action(), -1)).toThrow();
    expect(() => setWaitingReminder(action(), 1.5)).toThrow();
  });

  it("désactiver conserve afterDays et l'historique existant", () => {
    const withHistory = {
      ...setWaitingReminder(action(), 3),
      waitingReminder: { afterDays: 3, enabled: true, history: ["2026-09-05T00:00:00.000Z"] },
    };
    const disabled = disableWaitingReminder(withHistory);
    expect(disabled.waitingReminder).toEqual({
      afterDays: 3,
      enabled: false,
      history: ["2026-09-05T00:00:00.000Z"],
    });
  });

  it("désactiver une action sans relance est un no-op", () => {
    const plain = action({ waitingReminder: undefined });
    expect(disableWaitingReminder(plain)).toBe(plain);
  });
});

describe("isWaitingReminderDue", () => {
  it("faux si aucune relance configurée", () => {
    expect(isWaitingReminderDue(action(), new Date("2026-09-20T00:00:00.000Z"))).toBe(false);
  });

  it("faux si désactivée", () => {
    const rule = disableWaitingReminder(setWaitingReminder(action(), 3));
    expect(isWaitingReminderDue(rule, new Date("2026-09-20T00:00:00.000Z"))).toBe(false);
  });

  it("faux si le statut n'est plus waiting", () => {
    const withReminder = setWaitingReminder(action({ status: "doing", waitingSince: undefined }), 3);
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-20T00:00:00.000Z"))).toBe(false);
  });

  it("faux avant l'échéance, vrai à partir de l'échéance (3 jours)", () => {
    const withReminder = setWaitingReminder(action({ waitingSince: "2026-09-09T09:00:00.000Z" }), 3);
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-11T09:00:00.000Z"))).toBe(false); // J+2
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-12T08:59:59.000Z"))).toBe(false); // J+3 - 1s
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-12T09:00:00.000Z"))).toBe(true); // J+3 pile
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-15T00:00:00.000Z"))).toBe(true); // bien après
  });
});

describe("triggerWaitingReminderIfDue — idempotence", () => {
  it("n'ajoute rien si la relance n'est pas due", () => {
    const withReminder = setWaitingReminder(action(), 3);
    const result = triggerWaitingReminderIfDue(withReminder, new Date("2026-09-10T00:00:00.000Z"));
    expect(result).toBe(withReminder);
  });

  it("enregistre un déclenchement unique quand la relance devient due", () => {
    const withReminder = setWaitingReminder(action(), 3);
    const due = new Date("2026-09-12T09:00:00.000Z");
    const triggered = triggerWaitingReminderIfDue(withReminder, due);
    expect(triggered.waitingReminder?.history).toEqual([due.toISOString()]);
  });

  it("rejouer l'appel plusieurs fois ne duplique pas l'historique", () => {
    const withReminder = setWaitingReminder(action(), 3);
    const due = new Date("2026-09-12T09:00:00.000Z");
    const once = triggerWaitingReminderIfDue(withReminder, due);
    const twice = triggerWaitingReminderIfDue(once, due);
    const thrice = triggerWaitingReminderIfDue(twice, new Date("2026-09-13T00:00:00.000Z"));
    expect(thrice.waitingReminder?.history).toEqual([due.toISOString()]);
  });

  it("une nouvelle période d'attente autorise un nouveau déclenchement", () => {
    let current = setWaitingReminder(action(), 3);
    current = triggerWaitingReminderIfDue(current, new Date("2026-09-12T09:00:00.000Z"));
    expect(current.waitingReminder?.history).toHaveLength(1);

    // Sort puis rentre en attente : nouvelle période, relance conservée (enabled/afterDays).
    current = moveAction(current, { axis: "status", status: "doing" }, "2026-09-13T00:00:00.000Z");
    current = moveAction(current, { axis: "status", status: "waiting" }, "2026-09-20T00:00:00.000Z");
    expect(current.waitingReminder).toEqual({
      afterDays: 3,
      enabled: true,
      history: ["2026-09-12T09:00:00.000Z"],
    });

    current = triggerWaitingReminderIfDue(current, new Date("2026-09-23T00:00:00.000Z"));
    expect(current.waitingReminder?.history).toEqual([
      "2026-09-12T09:00:00.000Z",
      "2026-09-23T00:00:00.000Z",
    ]);
  });
});
