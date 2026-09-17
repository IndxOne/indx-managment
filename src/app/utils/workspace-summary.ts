import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Action, Priority } from "../../domain/types";

export interface WorkspaceSummary {
  relevantActionsCount: number;
  doneCount: number;
  nextDueLabel: string | null;
}

export type WorkspaceDerivedStatus = "new" | "active" | "done";

const WORKSPACE_STATUS_LABELS: Record<WorkspaceDerivedStatus, string> = {
  new: "Nouveau",
  active: "Actif",
  done: "Terminé",
};

/**
 * Statut d'espace affiché dans la liste des projets (Lot B) — dérivé
 * uniquement des actions réelles de l'espace, jamais un champ persisté
 * séparé (aucune migration Supabase requise pour cette information) :
 * "Nouveau" tant qu'aucune action n'existe, "Terminé" quand toutes les
 * actions existantes sont faites, "Actif" sinon.
 */
export function deriveWorkspaceStatus(actions: readonly Action[]): WorkspaceDerivedStatus {
  if (actions.length === 0) return "new";
  return actions.every((action) => action.status === "done") ? "done" : "active";
}

export function workspaceStatusLabel(status: WorkspaceDerivedStatus): string {
  return WORKSPACE_STATUS_LABELS[status];
}

const PRIORITY_ORDER: Priority[] = ["high", "normal", "low"];

/**
 * Priorité "dominante" de l'espace pour la liste des projets — la plus
 * élevée parmi les actions encore ouvertes (jamais parmi les actions
 * terminées, qui n'ont plus d'urgence). `null` si aucune action ouverte
 * (espace nouveau ou entièrement terminé) : pas de priorité à afficher.
 */
export function deriveWorkspaceTopPriority(actions: readonly Action[]): Priority | null {
  const open = actions.filter((action) => action.status !== "done");
  for (const priority of PRIORITY_ORDER) {
    if (open.some((action) => action.priority === priority)) return priority;
  }
  return null;
}

/**
 * Orchestration pure côté UI : délègue tout le calcul calendaire à
 * `deriveScheduleKeys` (Agent 1), ne réimplémente aucune règle métier.
 */
export function computeWorkspaceSummary(actions: Action[], timezone: string, now?: Date): WorkspaceSummary {
  const relevant = actions.filter((action) => action.status !== "done");

  const scheduledDays = relevant
    .map((action) => ({ action, derived: deriveScheduleKeys(action.schedule, timezone, now) }))
    .filter((entry): entry is typeof entry & { derived: { dayKey: string } } => Boolean(entry.derived.dayKey))
    .sort((a, b) => (a.derived.dayKey < b.derived.dayKey ? -1 : a.derived.dayKey > b.derived.dayKey ? 1 : 0));

  const next = scheduledDays[0];
  const nextDueLabel = next ? formatRelativeLabel(next.derived.relativeLabel) || next.derived.dayKey : null;
  const doneCount = actions.length - relevant.length;

  return { relevantActionsCount: relevant.length, doneCount, nextDueLabel };
}
