import { describe, expect, it } from "vitest";
import {
  addDays,
  formatIsoMonth,
  formatIsoWeek,
  getIsoWeekday,
  getIsoWeeksInYear,
  isoWeekStart,
  parseCalendarDate,
  parseIsoWeek,
} from "./iso-week";

describe("parseCalendarDate", () => {
  it("rejette une date inexistante (année bissextile)", () => {
    expect(() => parseCalendarDate("2023-02-29")).toThrow();
    expect(() => parseCalendarDate("2024-02-29")).not.toThrow(); // 2024 est bissextile
  });

  it("rejette un format invalide", () => {
    expect(() => parseCalendarDate("29/02/2024")).toThrow();
  });
});

describe("formatIsoWeek — cas limites obligatoires", () => {
  it("29 décembre est rattaché à la semaine 1 de l'année suivante quand applicable", () => {
    // 2025-12-29 est un lundi ; 2026-01-01 est un jeudi -> semaine ISO 2026-W01.
    expect(formatIsoWeek("2025-12-29")).toBe("2026-W01");
  });

  it("gère une année à 53 semaines ISO", () => {
    // 2020-12-31 est un jeudi -> appartient à la 53e semaine de 2020.
    expect(formatIsoWeek("2020-12-31")).toBe("2020-W53");
    expect(getIsoWeeksInYear(2020)).toBe(53);
  });

  it("une année standard compte 52 semaines", () => {
    expect(getIsoWeeksInYear(2023)).toBe(52);
  });

  it("passage février/mars reste dans la même semaine ISO", () => {
    // 2026-02-28 (samedi) et 2026-03-01 (dimanche) appartiennent à la même semaine.
    expect(formatIsoWeek("2026-02-28")).toBe(formatIsoWeek("2026-03-01"));
  });

  it("gère le 29 février d'une année bissextile", () => {
    expect(() => formatIsoWeek("2024-02-29")).not.toThrow();
  });
});

describe("parseIsoWeek / isoWeekStart", () => {
  it("rejette une semaine 53 pour une année qui n'en compte que 52", () => {
    expect(() => parseIsoWeek("2023-W53")).toThrow();
  });

  it("accepte la semaine 53 pour une année qui en compte 53", () => {
    expect(() => parseIsoWeek("2020-W53")).not.toThrow();
  });

  it("round-trip date -> semaine -> lundi de la semaine", () => {
    const week = formatIsoWeek("2026-03-01");
    const monday = isoWeekStart(week);
    expect(getIsoWeekday(monday)).toBe(1);
    expect(formatIsoWeek(monday)).toBe(week);
  });
});

describe("addDays / formatIsoMonth", () => {
  it("addDays traverse correctement un changement de mois et d'année", () => {
    expect(addDays("2025-12-30", 3)).toBe("2026-01-02");
  });

  it("formatIsoMonth dérive YYYY-MM à partir d'une date", () => {
    expect(formatIsoMonth("2026-02-28")).toBe("2026-02");
  });
});
