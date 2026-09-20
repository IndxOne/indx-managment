import { BRIEF_FILTERS, type BriefFilterId } from "../../utils/brief-labels";

/** Réutilise le patron segmented-scroll/segmented-chip existant
 * (QuickFilterChips) — aucun nouveau composant de filtre. */
export function BriefFilters({ active, onChange }: { active: BriefFilterId; onChange: (id: BriefFilterId) => void }) {
  return (
    <div className="segmented-scroll" role="group" aria-label="Filtrer le Brief">
      {BRIEF_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className="segmented-chip"
          aria-pressed={filter.id === active}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
