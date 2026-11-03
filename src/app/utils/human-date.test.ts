import { describe, expect, it } from "vitest";
import { humanSchedule } from "./human-date";

// Mardi 3 novembre 2026, midi à Paris.
const NOW = new Date("2026-11-03T11:00:00Z");
const tz = "Europe/Paris";
const day = (value: string) => ({ granularity: "day" as const, value });

describe("humanSchedule", () => {
  it("parle en mots du quotidien, jamais en ISO", () => {
    expect(humanSchedule(undefined, tz, NOW)).toBe("");
    expect(humanSchedule({ granularity: "none" }, tz, NOW)).toBe("");
    expect(humanSchedule(day("2026-11-03"), tz, NOW)).toBe("Aujourd'hui");
    expect(humanSchedule(day("2026-11-04"), tz, NOW)).toBe("Demain");
    expect(humanSchedule(day("2026-11-06"), tz, NOW)).toBe("Vendredi");
    expect(humanSchedule(day("2026-11-21"), tz, NOW)).toBe("21 nov.");
    expect(humanSchedule({ granularity: "week", value: "2026-W45" }, tz, NOW)).toBe("Cette semaine");
    expect(humanSchedule({ granularity: "week", value: "2026-W46" }, tz, NOW)).toBe("Semaine prochaine");
    expect(humanSchedule({ granularity: "month", value: "2026-11" }, tz, NOW)).toBe("Ce mois-ci");
    expect(humanSchedule({ granularity: "month", value: "2027-01" }, tz, NOW)).toBe("Janvier");
  });

  it("signale le retard", () => {
    expect(humanSchedule(day("2026-11-02"), tz, NOW)).toBe("En retard · 2 nov.");
  });
});
