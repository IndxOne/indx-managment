import type { ActionStatus, Priority, WorkItemType } from "../../domain/types";
import { PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";
import type { ActionFilters } from "../utils/filter-actions";

const STATUS_OPTIONS: ActionStatus[] = ["todo", "doing", "waiting", "done"];
const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];
const ITEM_TYPE_OPTIONS: WorkItemType[] = ["task", "request", "incident", "maintenance", "deliverable", "milestone"];

export function FilterSheet({
  filters,
  statusLabels,
  onChange,
  onClose,
}: {
  filters: ActionFilters;
  statusLabels: Record<ActionStatus, string>;
  onChange: (filters: ActionFilters) => void;
  onClose: () => void;
}) {
  function toggle<T>(set: ReadonlySet<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  return (
    <BottomSheet title="Filtres" onClose={onClose}>
      <p className="section-title">Statut</p>
      <div className="choice-group">
        {STATUS_OPTIONS.map((status) => (
          <label key={status} className="choice-option">
            <input
              type="checkbox"
              checked={filters.statuses.has(status)}
              onChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, status) })}
            />
            {statusLabels[status]}
          </label>
        ))}
      </div>

      <p className="section-title">Priorité</p>
      <div className="choice-group">
        {PRIORITY_OPTIONS.map((priority) => (
          <label key={priority} className="choice-option">
            <input
              type="checkbox"
              checked={filters.priorities.has(priority)}
              onChange={() => onChange({ ...filters, priorities: toggle(filters.priorities, priority) })}
            />
            {PRIORITY_LABELS[priority]}
          </label>
        ))}
      </div>

      <p className="section-title">Type</p>
      <div className="choice-group">
        {ITEM_TYPE_OPTIONS.map((itemType) => (
          <label key={itemType} className="choice-option">
            <input
              type="checkbox"
              checked={filters.itemTypes.has(itemType)}
              onChange={() => onChange({ ...filters, itemTypes: toggle(filters.itemTypes, itemType) })}
            />
            {itemType}
          </label>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-block tap-target" style={{ marginTop: 16 }} onClick={onClose}>
        Appliquer
      </button>
    </BottomSheet>
  );
}
