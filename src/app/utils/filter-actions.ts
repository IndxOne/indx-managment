import type { Action, ActionStatus, Priority, WorkItemType } from "../../domain/types";

/** "unassigned" = aucun responsable ; un id de membre = ce responsable précis ; absent = tous (Lot 8B). */
export type AssigneeFilter = "unassigned" | string;

export interface ActionFilters {
  statuses: ReadonlySet<ActionStatus>;
  priorities: ReadonlySet<Priority>;
  itemTypes: ReadonlySet<WorkItemType>;
  assignee?: AssigneeFilter;
}

export const EMPTY_FILTERS: ActionFilters = {
  statuses: new Set(),
  priorities: new Set(),
  itemTypes: new Set(),
  assignee: undefined,
};

export function applyFilters(actions: Action[], filters: ActionFilters): Action[] {
  return actions.filter(
    (action) =>
      (filters.statuses.size === 0 || filters.statuses.has(action.status)) &&
      (filters.priorities.size === 0 || filters.priorities.has(action.priority)) &&
      (filters.itemTypes.size === 0 || filters.itemTypes.has(action.itemType)) &&
      matchesAssignee(action, filters.assignee)
  );
}

function matchesAssignee(action: Action, assignee: AssigneeFilter | undefined): boolean {
  if (!assignee) return true;
  if (assignee === "unassigned") return action.assigneeIds.length === 0;
  return action.assigneeIds.includes(assignee);
}

export function hasActiveFilters(filters: ActionFilters): boolean {
  return filters.statuses.size > 0 || filters.priorities.size > 0 || filters.itemTypes.size > 0 || Boolean(filters.assignee);
}
