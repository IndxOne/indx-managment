import type { Schedule } from "../../domain/types";

/** Résumé lisible et compact d'une planification, réutilisé partout où l'action est listée sans le contexte du calendrier. */
export function scheduleSummary(schedule: Schedule | undefined): string {
  if (!schedule || schedule.granularity === "none") return "Non planifiée";
  if (schedule.granularity === "day") return `Jour · ${schedule.value}`;
  if (schedule.granularity === "week") return `Semaine ${schedule.value}`;
  return `Mois ${schedule.value}`;
}
