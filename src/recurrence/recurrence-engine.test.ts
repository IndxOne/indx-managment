import { describe, expect, it } from "vitest";
import type { Action } from "../domain/types";
import { generateRecurringOccurrences, type RecurrenceRule } from "./recurrence-engine";

function dayValue(action: Action): string {
  if (action.schedule?.granularity !== "day") {
    throw new Error("attendu une planification de type jour");
  }
  return action.schedule.value;
}

function rule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: "r1",
    workspaceId: "w1",
    frequency: "weekly",
    interval: 1,
    startDate: "2026-09-08", // mardi
    template: {
      title: "Contrôle hebdomadaire",
      priority: "normal",
      itemType: "task",
      assigneeIds: [],
      tags: [],
    },
    ...overrides,
  };
}

describe("generateRecurringOccurrences", () => {
  it("génère les occurrences hebdomadaires dans la fenêtre", () => {
    const occurrences = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-29" });
    expect(occurrences.map((a) => a.schedule)).toEqual([
      { granularity: "day", value: "2026-09-08" },
      { granularity: "day", value: "2026-09-15" },
      { granularity: "day", value: "2026-09-22" },
      { granularity: "day", value: "2026-09-29" },
    ]);
  });

  it("respecte l'intervalle (tous les N jours)", () => {
    const occurrences = generateRecurringOccurrences(rule({ frequency: "daily", interval: 3 }), {
      start: "2026-09-08",
      end: "2026-09-17",
    });
    expect(occurrences.map(dayValue)).toEqual([
      "2026-09-08",
      "2026-09-11",
      "2026-09-14",
      "2026-09-17",
    ]);
  });

  it("mensuel : cale sur le dernier jour du mois si le jour d'ancrage n'existe pas", () => {
    const occurrences = generateRecurringOccurrences(
      rule({ frequency: "monthly", interval: 1, startDate: "2026-01-31" }),
      { start: "2026-01-01", end: "2026-04-30" }
    );
    expect(occurrences.map(dayValue)).toEqual([
      "2026-01-31",
      "2026-02-28", // février n'a pas de 31
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("respecte la borne endDate même si elle est avant la fin de la fenêtre", () => {
    const occurrences = generateRecurringOccurrences(rule({ endDate: "2026-09-16" }), {
      start: "2026-09-08",
      end: "2026-09-29",
    });
    expect(occurrences.map(dayValue)).toEqual(["2026-09-08", "2026-09-15"]);
  });

  it("rejette un intervalle invalide", () => {
    expect(() =>
      generateRecurringOccurrences(rule({ interval: 0 }), { start: "2026-09-08", end: "2026-09-29" })
    ).toThrow();
  });

  it("idempotence : deux générations identiques produisent les mêmes ids", () => {
    const window = { start: "2026-09-08", end: "2026-09-29" };
    const first = generateRecurringOccurrences(rule(), window);
    const second = generateRecurringOccurrences(rule(), window);
    expect(second).toEqual(first);
  });

  it("récurrence déjà générée : une fenêtre élargie ne duplique pas les occurrences existantes", () => {
    const narrow = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-15" });
    const wide = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-29" });

    const merged = new Map(wide.map((a) => [a.id, a]));
    for (const occurrence of narrow) {
      merged.set(occurrence.id, occurrence); // simule un upsert par id
    }

    expect(merged.size).toBe(wide.length); // aucun doublon introduit
    for (const occurrence of narrow) {
      expect(merged.get(occurrence.id)).toEqual(occurrence);
    }
  });
});
