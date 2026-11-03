import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { deriveHomeBuckets } from "./home-buckets";

export interface Flux {
  /** La seule chose à faire maintenant (null = journée libre). */
  focus: Action | null;
  /** En retard, bloqué ou prévu aujourd'hui (hors focus). */
  now: Action[];
  /** Demain et le reste de la semaine. */
  soon: Action[];
  /** Attend quelqu'un d'autre, sans échéance urgente. */
  waiting: Action[];
  /** Sans date : la réserve. */
  someday: Action[];
  /** Terminées aujourd'hui : nourrit l'anneau de progression du jour. */
  doneToday: number;
}

const byPriority = (a: Action, b: Action) => rank(a) - rank(b);
const rank = (action: Action) => (action.priority === "high" ? 0 : action.priority === "normal" ? 1 : 2);

/**
 * Projection "Flux" : une question unique, "que faire maintenant ?".
 * Toutes les actions de tous les espaces, rangées par horizon temporel
 * plutôt que par espace — l'utilisateur pense en moments, pas en dossiers.
 */
export function buildFlux(actions: readonly Action[], timezone: string, now: Date = new Date()): Flux {
  const buckets = deriveHomeBuckets(actions, timezone, now);
  const urgent = [...buckets.overdue, ...buckets.today, ...buckets.blocked].sort(byPriority);
  const doing = actions.filter((action) => action.status === "doing");
  const focus = urgent.find((action) => action.status !== "blocked") ?? doing[0] ?? buckets.thisWeekPreview[0] ?? null;

  const placed = new Set([...urgent, ...buckets.thisWeekPreview].map((action) => action.id));
  const rest = actions.filter((action) => action.status !== "done" && !placed.has(action.id));
  const today = todayInTimeZone(timezone, now);

  return {
    focus,
    now: urgent.filter((action) => action !== focus),
    soon: buckets.thisWeekPreview.filter((action) => action !== focus).sort(byPriority),
    waiting: rest.filter((action) => action.status === "waiting" && action !== focus),
    someday: rest
      .filter((action) => action.status !== "waiting" && action !== focus && (!action.schedule || action.schedule.granularity === "none"))
      .sort(byPriority),
    doneToday: actions.filter(
      (action) => action.status === "done" && action.completedAt && todayInTimeZone(timezone, new Date(action.completedAt)) === today
    ).length,
  };
}
