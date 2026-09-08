import type { Action, ActionStatus, Priority, WorkItemType } from "../../domain/types";

export interface ActionFilters {
  statuses: ReadonlySet<ActionStatus>;
  priorities: ReadonlySet<Priority>;
  itemTypes: ReadonlySet<WorkItemType>;
}

export const EMPTY_FILTERS: ActionFilters = {
  statuses: new Set(),
  priorities: new Set(),
  itemTypes: new Set(),
};

export function applyFilters(actions: Action[], filters: ActionFilters): Action[] {
  return actions.filter(
    (action) =>
      (filters.statuses.size === 0 || filters.statuses.has(action.status)) &&
      (filters.priorities.size === 0 || filters.priorities.has(action.priority)) &&
      (filters.itemTypes.size === 0 || filters.itemTypes.has(action.itemType))
  );
}

export function hasActiveFilters(filters: ActionFilters): boolean {
  return filters.statuses.size > 0 || filters.priorities.size > 0 || filters.itemTypes.size > 0;
}
