import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";

export interface WorkspaceSummary {
  relevantActionsCount: number;
  doneCount: number;
  nextDueLabel: string | null;
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
