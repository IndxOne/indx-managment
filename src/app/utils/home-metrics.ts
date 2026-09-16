import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import type { HomeBuckets } from "./home-buckets";

export interface HomeMetrics {
  /** Actions non terminées dans les espaces RUN — réel, aucune valeur figée. */
  runActiveCount: number;
  /** Actions passées à "Terminé" aujourd'hui (fuseau utilisateur), toutes espaces confondus. */
  resolvedTodayCount: number;
  /** Échéances proches : aujourd'hui + reste de la semaine (buckets Home déjà calculés, aucun second moteur temporel). */
  upcomingDeadlineCount: number;
  /** Progression = terminées / total, toutes espaces confondus (ratio réel, pas une valeur inventée). null si aucune action (division par zéro évitée plutôt qu'un 0% trompeur). */
  progressRatio: number | null;
}

/**
 * Métriques de la grille "Aujourd'hui" (réalignement prototype v2.2 §5) —
 * dérivées exclusivement de données déjà en mémoire (aucun hardcode, cf.
 * règle "no hardcoded prototype data" du cadrage initial). `buckets` est le
 * même `HomeBuckets` que le reste de l'écran (une seule dérivation
 * temporelle, jamais deux).
 */
export function deriveHomeMetrics(
  allActions: readonly Action[],
  workspaces: readonly Workspace[],
  buckets: HomeBuckets,
  timezone: string,
  now: Date = new Date()
): HomeMetrics {
  const runWorkspaceIds = new Set(workspaces.filter((w) => w.kind === "run").map((w) => w.id));
  const runActiveCount = allActions.filter((a) => runWorkspaceIds.has(a.workspaceId) && a.status !== "done").length;

  const today = todayInTimeZone(timezone, now);
  const resolvedTodayCount = allActions.filter(
    (a) => a.status === "done" && a.completedAt && todayInTimeZone(timezone, new Date(a.completedAt)) === today
  ).length;

  const upcomingDeadlineCount = buckets.today.length + buckets.thisWeekPreview.length;

  const doneCount = allActions.filter((a) => a.status === "done").length;
  const progressRatio = allActions.length > 0 ? doneCount / allActions.length : null;

  return { runActiveCount, resolvedTodayCount, upcomingDeadlineCount, progressRatio };
}

/**
 * "Focus RUN Immédiat" (prototype) : l'action RUN active la plus urgente —
 * priorité haute d'abord, puis en retard/bloquée/aujourd'hui plutôt que
 * "cette semaine" (mêmes buckets Home, aucune nouvelle dérivation
 * temporelle). Retourne undefined si aucune action RUN active urgente.
 */
export function selectUrgentRunAction(workspaces: readonly Workspace[], buckets: HomeBuckets): Action | undefined {
  const runWorkspaceIds = new Set(workspaces.filter((w) => w.kind === "run").map((w) => w.id));
  const candidates = [...buckets.overdue, ...buckets.blocked, ...buckets.today].filter((a) =>
    runWorkspaceIds.has(a.workspaceId)
  );
  if (candidates.length === 0) return undefined;
  const highPriority = candidates.find((a) => a.priority === "high");
  return highPriority ?? candidates[0];
}

/**
 * "Jalons Projet" (prototype) : la prochaine échéance PROJET à venir —
 * privilégie un `itemType: "milestone"` explicite, sinon la première
 * échéance projet trouvée dans les mêmes buckets. Retourne undefined si
 * aucune échéance projet dans les buckets Home (Home n'est pas exhaustif,
 * cf. deriveHomeBuckets).
 */
export function selectNearestProjectMilestone(workspaces: readonly Workspace[], buckets: HomeBuckets): Action | undefined {
  const projectWorkspaceIds = new Set(workspaces.filter((w) => w.kind === "project").map((w) => w.id));
  const candidates = [...buckets.today, ...buckets.thisWeekPreview, ...buckets.overdue].filter((a) =>
    projectWorkspaceIds.has(a.workspaceId)
  );
  if (candidates.length === 0) return undefined;
  const milestone = candidates.find((a) => a.itemType === "milestone");
  return milestone ?? candidates[0];
}
