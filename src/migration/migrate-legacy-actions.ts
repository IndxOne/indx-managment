import { isValidIsoMonth, parseCalendarDate, parseIsoWeek } from "../calendar/iso-week";
import type { Action, ActionStatus, Priority, Schedule, WorkItemType } from "../domain/types";

/**
 * Forme héritée du prototype : trois champs de planification potentiellement
 * contradictoires (cadrage §6). La migration les réduit à un `Schedule`
 * unique.
 */
export interface LegacyAction {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: Priority;
  itemType: WorkItemType;
  phaseId?: string;
  dueDate?: string; // YYYY-MM-DD
  week?: string; // YYYY-Www
  month?: string; // YYYY-MM
  assigneeIds?: string[];
  tags?: string[];
  sourceNoteId?: string;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Priorité de résolution en cas de champs contradictoires :
 * dueDate (le plus précis) > week > month > aucune planification.
 * Décision documentée ici faute de règle explicite dans le cadrage.
 */
function resolveLegacySchedule(legacy: LegacyAction): Schedule {
  if (legacy.dueDate) {
    parseCalendarDate(legacy.dueDate);
    return { granularity: "day", value: legacy.dueDate };
  }
  if (legacy.week) {
    parseIsoWeek(legacy.week);
    return { granularity: "week", value: legacy.week };
  }
  if (legacy.month) {
    if (!isValidIsoMonth(legacy.month)) {
      throw new Error(`Mois invalide : ${legacy.month}`);
    }
    return { granularity: "month", value: legacy.month };
  }
  return { granularity: "none" };
}

export function migrateLegacyAction(legacy: LegacyAction): Action {
  if (!legacy.id || !legacy.workspaceId || !legacy.title?.trim()) {
    throw new Error(`Action héritée invalide (id/workspaceId/title requis) : ${JSON.stringify(legacy)}`);
  }

  return {
    id: legacy.id,
    workspaceId: legacy.workspaceId,
    title: legacy.title,
    description: legacy.description,
    status: legacy.status,
    priority: legacy.priority,
    itemType: legacy.itemType,
    phaseId: legacy.phaseId,
    schedule: resolveLegacySchedule(legacy),
    assigneeIds: legacy.assigneeIds ?? [],
    tags: legacy.tags ?? [],
    sourceNoteId: legacy.sourceNoteId,
    recurrenceRuleId: legacy.recurrenceRuleId,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    completedAt: legacy.completedAt,
  };
}

export function migrateLegacyActions(legacyActions: readonly LegacyAction[]): Action[] {
  return legacyActions.map(migrateLegacyAction);
}
