import type { ActionStatus, Priority } from "../../domain/types";
import type { Member } from "../../domain/member";
import { ITEM_TYPE_LABELS, ITEM_TYPE_OPTIONS, PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";
import { StatusCheckIcon } from "./Icons";
import type { ActionFilters, AssigneeFilter } from "../utils/filter-actions";

const STATUS_OPTIONS: ActionStatus[] = ["todo", "doing", "blocked", "waiting", "done"];
const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];

export function FilterSheet({
  filters,
  statusLabels,
  /** Membres de l'espace (Lot 8B) — section "Responsable" affichée uniquement si fourni (mode Équipe). */
  members,
  onChange,
  onClose,
}: {
  filters: ActionFilters;
  statusLabels: Record<ActionStatus, string>;
  members?: Member[];
  onChange: (filters: ActionFilters) => void;
  onClose: () => void;
}) {
  function toggle<T>(set: ReadonlySet<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function setAssignee(value: AssigneeFilter | undefined) {
    onChange({ ...filters, assignee: value });
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
            <StatusCheckIcon status={status} size={18} />
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
            {priority === "high" && (
              <span
                aria-hidden="true"
                style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-danger)", flexShrink: 0 }}
              />
            )}
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
            {ITEM_TYPE_LABELS[itemType]}
          </label>
        ))}
      </div>

      {members && (
        <>
          <p className="section-title">Responsable</p>
          <div className="choice-group" role="radiogroup" aria-label="Filtrer par responsable">
            <label className="choice-option">
              <input type="radio" name="assignee-filter" checked={!filters.assignee} onChange={() => setAssignee(undefined)} />
              Tous
            </label>
            {members.filter((member) => member.active).map((member) => (
              <label key={member.id} className="choice-option">
                <input
                  type="radio"
                  name="assignee-filter"
                  checked={filters.assignee === member.id}
                  onChange={() => setAssignee(member.id)}
                />
                {member.displayName}
              </label>
            ))}
            <label className="choice-option">
              <input
                type="radio"
                name="assignee-filter"
                checked={filters.assignee === "unassigned"}
                onChange={() => setAssignee("unassigned")}
              />
              Non assigné
            </label>
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block tap-target" onClick={onClose}>
          Appliquer
        </button>
      </div>
    </BottomSheet>
  );
}
