import type { Priority, ProfessionalApproach } from "../../domain/types";
import { APPROACH_LABELS } from "../labels";
import type { WorkspaceDerivedStatus } from "../utils/workspace-summary";
import { workspaceStatusLabel } from "../utils/workspace-summary";
import type { WorkspaceFilters } from "../utils/filter-workspaces";
import { BottomSheet } from "./BottomSheet";

const STATUS_OPTIONS: WorkspaceDerivedStatus[] = ["active", "done", "new"];
const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];
const APPROACH_OPTIONS = Object.keys(APPROACH_LABELS) as ProfessionalApproach[];

export function WorkspaceFilterSheet({
  filters,
  onChange,
  onClose,
}: {
  filters: WorkspaceFilters;
  onChange: (filters: WorkspaceFilters) => void;
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
            {workspaceStatusLabel(status)}
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
            {priority === "high" ? "Haute" : priority === "normal" ? "Normale" : "Basse"}
          </label>
        ))}
      </div>

      <p className="section-title">Approche métier</p>
      <div className="choice-group">
        {APPROACH_OPTIONS.map((approach) => (
          <label key={approach} className="choice-option">
            <input
              type="checkbox"
              checked={filters.approaches.has(approach)}
              onChange={() => onChange({ ...filters, approaches: toggle(filters.approaches, approach) })}
            />
            {APPROACH_LABELS[approach]}
          </label>
        ))}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block tap-target" onClick={onClose}>
          Appliquer
        </button>
      </div>
    </BottomSheet>
  );
}
