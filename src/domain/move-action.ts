import { addDays, getIsoWeekday, isoWeekStart } from "../calendar/iso-week";
import type { Action, ActionStatus, Schedule } from "./types";

export type MoveAxis = "schedule" | "phase" | "status";

export type ScheduleMoveDestination =
  | { granularity: "none" }
  | {
      /** Semaine ISO cible (déplacement dans une vue hebdomadaire). */
      targetWeek: string;
      /**
       * Requis uniquement pour un changement de granularité mois → semaine
       * (cadrage §6 : "changer la granularité après confirmation").
       */
      confirmed?: boolean;
    };

export type MoveDestination =
  | { axis: "schedule"; to: ScheduleMoveDestination }
  | { axis: "phase"; phaseId: string | undefined }
  | { axis: "status"; status: ActionStatus };

/**
 * Déplace une action selon un seul axe à la fois. Chaque branche ne modifie
 * que les champs de son axe : un déplacement de phase ne touche jamais au
 * calendrier ni au statut, et réciproquement (cadrage §6).
 */
export function moveAction(action: Action, destination: MoveDestination, now?: string): Action {
  const updatedAt = now ?? new Date().toISOString();

  switch (destination.axis) {
    case "schedule":
      return {
        ...action,
        schedule: resolveScheduleMove(action.schedule, destination.to),
        updatedAt,
      };
    case "phase":
      return { ...action, phaseId: destination.phaseId, updatedAt };
    case "status":
      return {
        ...action,
        status: destination.status,
        completedAt: destination.status === "done" ? updatedAt : undefined,
        updatedAt,
      };
  }
}

function resolveScheduleMove(current: Schedule | undefined, to: ScheduleMoveDestination): Schedule {
  if (to.granularity === "none") {
    return { granularity: "none" };
  }

  const currentGranularity = current?.granularity ?? "none";

  if (currentGranularity === "day" && current) {
    // Jour vers autre semaine : conserver le jour de semaine.
    const weekday = getIsoWeekday(current.value); // 1..7
    const targetMonday = isoWeekStart(to.targetWeek);
    const targetDate = addDays(targetMonday, weekday - 1);
    return { granularity: "day", value: targetDate };
  }

  if (currentGranularity === "month") {
    // Mois vers semaine : changer la granularité après confirmation.
    if (!to.confirmed) {
      throw new Error("Confirmation requise pour passer d'une planification mensuelle à une semaine");
    }
    return { granularity: "week", value: to.targetWeek };
  }

  // Semaine vers autre semaine (ou aucune planification vers semaine) :
  // remplacer directement la valeur ISO.
  return { granularity: "week", value: to.targetWeek };
}
