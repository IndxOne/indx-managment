import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { isOverdue } from "./is-overdue";

export interface HomeBuckets {
  today: Action[];
  overdue: Action[];
  blocked: Action[];
  /** Reste de la semaine (demain + cette semaine), hors ce qui est déjà dans les 3 buckets ci-dessus — aperçu condensé, jamais la vue Semaine complète (cf. HomeScreen). */
  thisWeekPreview: Action[];
}

/**
 * Regroupement temporel de Home (Lot 7 §B) : chaque action apparaît dans
 * EXACTEMENT un bucket, jamais plusieurs — priorité explicite en cas de
 * chevauchement :
 *   1. En retard (statut != done ET échéance dépassée) — l'action y reste
 *      même si elle est aussi bloquée ; `action.status === "blocked"` sur
 *      une carte de ce bucket suffit à afficher un badge "Bloqué" sans la
 *      dupliquer dans le bucket Bloqué.
 *   2. Bloqué (status === "blocked", non déjà classée en retard)
 *   3. Aujourd'hui (échéance du jour)
 *   4. Cette semaine (demain / reste de la semaine)
 * "Terminé" est toujours exclu. Les actions sans échéance, en attente sans
 * retard, ou planifiées au-delà de la semaine n'apparaissent dans aucun
 * bucket (Home n'est pas un dashboard exhaustif — cf. RUN/PROJET/Semaine
 * pour la vue complète). Réutilise `deriveScheduleKeys`/`isOverdue`, aucun
 * second moteur temporel.
 */
export function deriveHomeBuckets(actions: readonly Action[], timezone: string, now: Date = new Date()): HomeBuckets {
  const buckets: HomeBuckets = { today: [], overdue: [], blocked: [], thisWeekPreview: [] };

  for (const action of actions) {
    if (action.status === "done") continue;

    if (isOverdue(action.schedule, timezone, now)) {
      buckets.overdue.push(action);
      continue;
    }

    if (action.status === "blocked") {
      buckets.blocked.push(action);
      continue;
    }

    const derived = deriveScheduleKeys(action.schedule, timezone, now);
    if (derived.relativeLabel === "today") {
      buckets.today.push(action);
    } else if (derived.relativeLabel === "tomorrow" || derived.relativeLabel === "this_week") {
      buckets.thisWeekPreview.push(action);
    }
  }

  return buckets;
}
