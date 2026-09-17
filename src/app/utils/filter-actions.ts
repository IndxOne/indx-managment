import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action, ActionStatus, Priority, WorkItemType } from "../../domain/types";
import { isOverdue } from "./is-overdue";

/** "unassigned" = aucun responsable ; un id de membre = ce responsable précis ; absent = tous (Lot 8B). */
export type AssigneeFilter = "unassigned" | string;

/** Échéance (§15) — dérivée de `schedule` via les mêmes primitives que
 * `deriveScheduleKeys`/`isOverdue`, jamais un nouveau champ domaine. */
export type DueBucket = "overdue" | "today" | "this_week" | "unscheduled";

export interface ActionFilters {
  statuses: ReadonlySet<ActionStatus>;
  priorities: ReadonlySet<Priority>;
  itemTypes: ReadonlySet<WorkItemType>;
  assignee?: AssigneeFilter;
  dueBuckets: ReadonlySet<DueBucket>;
}

export const EMPTY_FILTERS: ActionFilters = {
  statuses: new Set(),
  priorities: new Set(),
  itemTypes: new Set(),
  assignee: undefined,
  dueBuckets: new Set(),
};

export function applyFilters(actions: Action[], filters: ActionFilters, timezone?: string, now?: Date): Action[] {
  return actions.filter(
    (action) =>
      (filters.statuses.size === 0 || filters.statuses.has(action.status)) &&
      (filters.priorities.size === 0 || filters.priorities.has(action.priority)) &&
      (filters.itemTypes.size === 0 || filters.itemTypes.has(action.itemType)) &&
      matchesAssignee(action, filters.assignee) &&
      matchesDueBucket(action, filters.dueBuckets, timezone, now)
  );
}

function matchesDueBucket(action: Action, buckets: ReadonlySet<DueBucket>, timezone?: string, now?: Date): boolean {
  if (buckets.size === 0) return true;
  if (!timezone) return true;
  if (buckets.has("overdue") && isOverdue(action.schedule, timezone, now)) return true;
  const derived = deriveScheduleKeys(action.schedule, timezone, now);
  if (buckets.has("unscheduled") && derived.relativeLabel === "unscheduled") return true;
  if (buckets.has("today") && derived.relativeLabel === "today") return true;
  if (buckets.has("this_week") && (derived.relativeLabel === "this_week" || derived.relativeLabel === "tomorrow"))
    return true;
  return false;
}

function matchesAssignee(action: Action, assignee: AssigneeFilter | undefined): boolean {
  if (!assignee) return true;
  if (assignee === "unassigned") return action.assigneeIds.length === 0;
  return action.assigneeIds.includes(assignee);
}

export function hasActiveFilters(filters: ActionFilters): boolean {
  return (
    filters.statuses.size > 0 ||
    filters.priorities.size > 0 ||
    filters.itemTypes.size > 0 ||
    Boolean(filters.assignee) ||
    filters.dueBuckets.size > 0
  );
}
