import { describe, expect, it } from "vitest";
import { isOverdue } from "./is-overdue";

const NOW = new Date("2026-09-11T10:00:00.000Z"); // vendredi 2026-W37
const TZ = "Europe/Paris";

describe("isOverdue", () => {
  it("aucune planification -> jamais en retard", () => {
    expect(isOverdue(undefined, TZ, NOW)).toBe(false);
    expect(isOverdue({ granularity: "none" }, TZ, NOW)).toBe(false);
  });

  it("jour antérieur à aujourd'hui -> en retard", () => {
    expect(isOverdue({ granularity: "day", value: "2026-09-10" }, TZ, NOW)).toBe(true);
  });

  it("jour égal à aujourd'hui -> pas en retard", () => {
    expect(isOverdue({ granularity: "day", value: "2026-09-11" }, TZ, NOW)).toBe(false);
  });

  it("jour futur -> pas en retard", () => {
    expect(isOverdue({ granularity: "day", value: "2026-09-12" }, TZ, NOW)).toBe(false);
  });

  it("semaine antérieure à la semaine courante -> en retard", () => {
    expect(isOverdue({ granularity: "week", value: "2026-W36" }, TZ, NOW)).toBe(true);
  });

  it("semaine courante -> pas en retard", () => {
    expect(isOverdue({ granularity: "week", value: "2026-W37" }, TZ, NOW)).toBe(false);
  });

  it("mois antérieur au mois courant -> en retard", () => {
    expect(isOverdue({ granularity: "month", value: "2026-08" }, TZ, NOW)).toBe(true);
  });

  it("mois courant -> pas en retard", () => {
    expect(isOverdue({ granularity: "month", value: "2026-09" }, TZ, NOW)).toBe(false);
  });
});
