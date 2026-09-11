import { formatIsoMonth, formatIsoWeek } from "../../calendar/iso-week";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Schedule } from "../../domain/types";

/**
 * Une action est en retard si sa planification est strictement antérieure à
 * "aujourd'hui" dans le fuseau donné — comparaison de chaînes ISO
 * (YYYY-MM-DD / YYYY-Www / YYYY-MM s'ordonnent lexicographiquement comme des
 * dates), aucun nouveau champ domaine ni moteur calendrier : réutilise les
 * mêmes primitives que `deriveScheduleKeys` (Lot 7 §A/B).
 */
export function isOverdue(schedule: Schedule | undefined, timezone: string, now: Date = new Date()): boolean {
  if (!schedule || schedule.granularity === "none") return false;
  const today = todayInTimeZone(timezone, now);
  if (schedule.granularity === "day") return schedule.value < today;
  if (schedule.granularity === "week") return schedule.value < formatIsoWeek(today);
  return schedule.value < formatIsoMonth(today);
}
