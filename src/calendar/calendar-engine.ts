import type { Schedule } from "../domain/types";
import { addDays, formatIsoMonth, formatIsoWeek, isoWeekStart, parseCalendarDate } from "./iso-week";

export type RelativeLabelKey =
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "this_month"
  | "unscheduled"
  | "other";

export interface DerivedSchedule {
  granularity: Schedule["granularity"];
  dayKey?: string;
  isoWeekKey?: string;
  isoMonthKey?: string;
  relativeLabel: RelativeLabelKey;
}

const RELATIVE_LABELS_FR: Record<RelativeLabelKey, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
  this_week: "Cette semaine",
  next_week: "Semaine prochaine",
  this_month: "Ce mois-ci",
  unscheduled: "Non planifié",
  other: "",
};

export function formatRelativeLabel(key: RelativeLabelKey): string {
  return RELATIVE_LABELS_FR[key];
}

/**
 * Date calendaire (YYYY-MM-DD) correspondant à "maintenant" dans le fuseau
 * donné. Astuce sans dépendance : la locale en-CA formate nativement en
 * YYYY-MM-DD.
 */
export function todayInTimeZone(timezone: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function nextIsoWeekKey(isoWeekKey: string): string {
  const monday = isoWeekStart(isoWeekKey);
  return formatIsoWeek(addDays(monday, 7));
}

/**
 * Dérive les clés de regroupement (jour/semaine/mois) et le libellé relatif
 * d'une planification, à partir du fuseau de l'utilisateur. `now` est
 * injectable pour les tests ; par défaut l'instant courant.
 */
export function deriveScheduleKeys(
  schedule: Schedule | undefined,
  timezone: string,
  now: Date = new Date()
): DerivedSchedule {
  if (!schedule || schedule.granularity === "none") {
    return { granularity: "none", relativeLabel: "unscheduled" };
  }

  const today = todayInTimeZone(timezone, now);

  if (schedule.granularity === "day") {
    const dayKey = schedule.value;
    parseCalendarDate(dayKey);
    const isoWeekKey = formatIsoWeek(dayKey);
    const isoMonthKey = formatIsoMonth(dayKey);
    const todayWeek = formatIsoWeek(today);
    const tomorrow = addDays(today, 1);

    let relativeLabel: RelativeLabelKey = "other";
    if (dayKey === today) relativeLabel = "today";
    else if (dayKey === tomorrow) relativeLabel = "tomorrow";
    else if (isoWeekKey === todayWeek) relativeLabel = "this_week";
    else if (isoWeekKey === nextIsoWeekKey(todayWeek)) relativeLabel = "next_week";

    return { granularity: "day", dayKey, isoWeekKey, isoMonthKey, relativeLabel };
  }

  if (schedule.granularity === "week") {
    const isoWeekKey = schedule.value;
    const todayWeek = formatIsoWeek(today);
    let relativeLabel: RelativeLabelKey = "other";
    if (isoWeekKey === todayWeek) relativeLabel = "this_week";
    else if (isoWeekKey === nextIsoWeekKey(todayWeek)) relativeLabel = "next_week";
    return { granularity: "week", isoWeekKey, relativeLabel };
  }

  // month
  const isoMonthKey = schedule.value;
  const todayMonth = formatIsoMonth(today);
  return {
    granularity: "month",
    isoMonthKey,
    relativeLabel: isoMonthKey === todayMonth ? "this_month" : "other",
  };
}
