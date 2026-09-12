import { describe, expect, it } from "vitest";
import type { Action } from "../domain/types";
import { defaultMaterializationWindow, generateRecurringOccurrences, type RecurrenceRule } from "./recurrence-engine";

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

describe("generateRecurringOccurrences — id d'occurrence (uuid déterministe)", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("produit toujours un uuid syntaxiquement valide (jamais `${ruleId}__${date}`)", () => {
    const occurrences = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-29" });
    for (const occurrence of occurrences) {
      expect(occurrence.id).toMatch(UUID_RE);
    }
  });

  it("même règle + même date => même uuid entre deux appels indépendants", () => {
    const a = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-08" });
    const b = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-08" });
    expect(a[0]!.id).toBe(b[0]!.id);
  });

  it("une règle différente (même date) => uuid différent", () => {
    const a = generateRecurringOccurrences(rule({ id: "r1" }), { start: "2026-09-08", end: "2026-09-08" });
    const b = generateRecurringOccurrences(rule({ id: "r2" }), { start: "2026-09-08", end: "2026-09-08" });
    expect(a[0]!.id).not.toBe(b[0]!.id);
  });

  it("une date différente (même règle) => uuid différent", () => {
    const occurrences = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-15" });
    expect(occurrences[0]!.id).not.toBe(occurrences[1]!.id);
  });

  it("génération répétée sur une fenêtre élargie : zéro doublon logique (mêmes ids réutilisés, jamais de nouveaux ids pour les mêmes dates)", () => {
    const narrow = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-15" });
    const wide = generateRecurringOccurrences(rule(), { start: "2026-09-08", end: "2026-09-29" });
    for (const occurrence of narrow) {
      const same = wide.find((candidate) => dayValue(candidate) === dayValue(occurrence));
      expect(same?.id).toBe(occurrence.id);
    }
    expect(new Set(wide.map((a) => a.id)).size).toBe(wide.length); // pas deux occurrences avec le même id
  });

  it("valide pour daily/weekly/monthly", () => {
    const daily = generateRecurringOccurrences(rule({ frequency: "daily", interval: 1 }), {
      start: "2026-09-08",
      end: "2026-09-10",
    });
    const monthly = generateRecurringOccurrences(rule({ frequency: "monthly", interval: 1, startDate: "2026-01-31" }), {
      start: "2026-01-01",
      end: "2026-03-31",
    });
    for (const occurrence of [...daily, ...monthly]) {
      expect(occurrence.id).toMatch(UUID_RE);
    }
  });
});

describe("defaultMaterializationWindow", () => {
  it("s'étend sur l'horizon par défaut (90 jours) depuis aujourd'hui quand endDate est absent", () => {
    const window = defaultMaterializationWindow({ startDate: "2026-09-01" }, "2026-09-08");
    expect(window).toEqual({ start: "2026-09-01", end: "2026-12-07" });
  });

  it("se borne à endDate si elle arrive avant l'horizon", () => {
    const window = defaultMaterializationWindow({ startDate: "2026-09-01", endDate: "2026-09-20" }, "2026-09-08");
    expect(window).toEqual({ start: "2026-09-01", end: "2026-09-20" });
  });

  it("ignore endDate si elle dépasse l'horizon", () => {
    const window = defaultMaterializationWindow({ startDate: "2026-09-01", endDate: "2028-01-01" }, "2026-09-08");
    expect(window).toEqual({ start: "2026-09-01", end: "2026-12-07" });
  });
});
