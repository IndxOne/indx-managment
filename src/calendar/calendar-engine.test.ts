import { describe, expect, it } from "vitest";
import { deriveScheduleKeys, todayInTimeZone } from "./calendar-engine";

describe("todayInTimeZone — changement de fuseau", () => {
  it("peut donner deux dates calendaires différentes pour le même instant selon le fuseau", () => {
    // 2026-01-01T23:30:00Z : encore le 1er à Londres, déjà le 2 à Auckland.
    const instant = new Date("2026-01-01T23:30:00Z");
    expect(todayInTimeZone("Europe/London", instant)).toBe("2026-01-01");
    expect(todayInTimeZone("Pacific/Auckland", instant)).toBe("2026-01-02");
  });
});

describe("deriveScheduleKeys", () => {
  const now = new Date("2026-03-04T09:00:00Z"); // mercredi

  it("aucune planification -> unscheduled", () => {
    expect(deriveScheduleKeys(undefined, "Europe/Paris", now).relativeLabel).toBe("unscheduled");
    expect(deriveScheduleKeys({ granularity: "none" }, "Europe/Paris", now).relativeLabel).toBe(
      "unscheduled"
    );
  });

  it("jour == aujourd'hui -> today", () => {
    const result = deriveScheduleKeys({ granularity: "day", value: "2026-03-04" }, "Europe/Paris", now);
    expect(result.relativeLabel).toBe("today");
    expect(result.isoWeekKey).toBe("2026-W10");
  });

  it("jour == demain -> tomorrow", () => {
    const result = deriveScheduleKeys({ granularity: "day", value: "2026-03-05" }, "Europe/Paris", now);
    expect(result.relativeLabel).toBe("tomorrow");
  });

  it("même semaine ISO sans être aujourd'hui/demain -> this_week", () => {
    const result = deriveScheduleKeys({ granularity: "day", value: "2026-03-08" }, "Europe/Paris", now); // dimanche même semaine
    expect(result.relativeLabel).toBe("this_week");
  });

  it("semaine suivante -> next_week", () => {
    const result = deriveScheduleKeys({ granularity: "day", value: "2026-03-10" }, "Europe/Paris", now);
    expect(result.relativeLabel).toBe("next_week");
  });

  it("granularité semaine comparée à la semaine courante", () => {
    expect(
      deriveScheduleKeys({ granularity: "week", value: "2026-W10" }, "Europe/Paris", now).relativeLabel
    ).toBe("this_week");
    expect(
      deriveScheduleKeys({ granularity: "week", value: "2026-W11" }, "Europe/Paris", now).relativeLabel
    ).toBe("next_week");
  });

  it("granularité mois comparée au mois courant", () => {
    expect(
      deriveScheduleKeys({ granularity: "month", value: "2026-03" }, "Europe/Paris", now).relativeLabel
    ).toBe("this_month");
    expect(
      deriveScheduleKeys({ granularity: "month", value: "2026-04" }, "Europe/Paris", now).relativeLabel
    ).toBe("other");
  });
});
