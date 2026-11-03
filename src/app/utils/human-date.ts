import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import { isoWeekStart } from "../../calendar/iso-week";
import type { Schedule } from "../../domain/types";
import { isOverdue } from "./is-overdue";

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });

const asUtc = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Échéance en mots du quotidien : "Aujourd'hui", "Demain", "Jeudi",
 * "21 nov.", "En retard · 21 oct." — jamais une date ISO brute à l'écran.
 * Chaîne vide si aucune échéance.
 */
export function humanSchedule(schedule: Schedule | undefined, timezone: string, now: Date = new Date()): string {
  if (!schedule || schedule.granularity === "none") return "";
  const derived = deriveScheduleKeys(schedule, timezone, now);
  let label: string;
  if (schedule.granularity === "day") {
    const day = schedule.value;
    if (derived.relativeLabel === "today") label = "Aujourd'hui";
    else if (derived.relativeLabel === "tomorrow") label = "Demain";
    else if (derived.relativeLabel === "this_week" && !isOverdue(schedule, timezone, now)) label = capitalize(WEEKDAY.format(asUtc(day)));
    else label = DAY.format(asUtc(day));
  } else if (schedule.granularity === "week") {
    label =
      derived.relativeLabel === "this_week"
        ? "Cette semaine"
        : derived.relativeLabel === "next_week"
          ? "Semaine prochaine"
          : `Sem. du ${DAY.format(asUtc(isoWeekStart(schedule.value)))}`;
  } else {
    label = derived.relativeLabel === "this_month" ? "Ce mois-ci" : capitalize(MONTH.format(asUtc(`${schedule.value}-01`)));
  }
  return isOverdue(schedule, timezone, now) ? `En retard · ${label}` : label;
}
