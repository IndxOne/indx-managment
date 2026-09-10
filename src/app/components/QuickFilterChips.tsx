import type { ActionFilters } from "../utils/filter-actions";
import { resolveQuickFilters } from "../utils/quick-filters";

/** Raccourcis de filtre propres à l'approche de l'espace (cadrage §5, PRESET_REGISTRY.quickFilters). */
export function QuickFilterChips({
  quickFilterIds,
  filters,
  onChange,
}: {
  quickFilterIds: readonly string[];
  filters: ActionFilters;
  onChange: (filters: ActionFilters) => void;
}) {
  const chips = resolveQuickFilters(quickFilterIds);
  if (chips.length === 0) return null;

  return (
    <div className="segmented-scroll" role="group" aria-label="Filtres rapides">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="segmented-chip"
          aria-pressed={chip.isActive(filters)}
          onClick={() => onChange(chip.apply(filters))}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
