/**
 * Moteur calendrier ISO 8601, sans dépendance externe.
 * Toutes les fonctions opèrent sur des dates calendaires (YYYY-MM-DD) via
 * UTC pour l'arithmétique — une date calendaire appartient à une semaine
 * ISO indépendamment du fuseau de l'observateur. Le fuseau n'intervient
 * qu'au moment de dériver "aujourd'hui" depuis un instant (voir
 * calendar-engine.ts).
 */

const MS_PER_DAY = 86_400_000;

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Date invalide (attendu YYYY-MM-DD) : ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  if (!isReal) {
    throw new Error(`Date calendaire inexistante : ${value}`);
  }
  return { year, month, day };
}

function toUtcDate({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function formatCalendarDate(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateValue: string, days: number): string {
  const date = toUtcDate(parseCalendarDate(dateValue));
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

/** 1 = lundi ... 7 = dimanche (ISO 8601). */
export function getIsoWeekday(dateValue: string): number {
  const date = toUtcDate(parseCalendarDate(dateValue));
  return date.getUTCDay() || 7;
}

export function getIsoWeekInfo(dateValue: string): { isoYear: number; isoWeek: number } {
  const date = toUtcDate(parseCalendarDate(dateValue));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // jeudi de la semaine ISO
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((date.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { isoYear, isoWeek };
}

export function formatIsoWeek(dateValue: string): string {
  const { isoYear, isoWeek } = getIsoWeekInfo(dateValue);
  return `${isoYear.toString().padStart(4, "0")}-W${isoWeek.toString().padStart(2, "0")}`;
}

export function formatIsoMonth(dateValue: string): string {
  const { year, month } = parseCalendarDate(dateValue);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

/** Nombre de semaines ISO dans une année (52 ou 53), règle de Richards. */
export function getIsoWeeksInYear(isoYear: number): number {
  const p = (y: number) =>
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
  return p(isoYear) === 4 || p(isoYear - 1) === 3 ? 53 : 52;
}

export function parseIsoWeek(value: string): { isoYear: number; isoWeek: number } {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Semaine ISO invalide (attendu YYYY-Www) : ${value}`);
  }
  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  const weeksInYear = getIsoWeeksInYear(isoYear);
  if (isoWeek < 1 || isoWeek > weeksInYear) {
    throw new Error(`Semaine ISO invalide : ${value} (l'année ${isoYear} compte ${weeksInYear} semaines)`);
  }
  return { isoYear, isoWeek };
}

/** Date (lundi) du premier jour d'une semaine ISO donnée. */
export function isoWeekStart(value: string): string {
  const { isoYear, isoWeek } = parseIsoWeek(value);
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNum = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return formatCalendarDate(start);
}

export function isValidIsoMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
