import type { RecentChangeItem, RecentChangeSourceType } from "../../../domain/v3/project-overview/types";
import { RECENT_CHANGE_TYPE_LABELS } from "../../utils/project-overview-labels";

function formatChangeDate(updatedAt: string): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Zone "Changé récemment" (UX-5.3) — bloc compact et informatif, jamais un
 * journal technique : au plus 5 entités déjà propagées par
 * `buildProjectOverview()` (aucune nouvelle requête), avec un intitulé
 * métier + une date courte, jamais un id/nom de table/`updated_at` brut.
 * Masqué entièrement si vide — jamais une zone réservée mais vide. Un clic
 * présélectionne la catégorie Explorer correspondante (même mécanisme que
 * les autres deep-links de cet écran).
 */
export function ProjectRecentChanges({
  recentChanges,
  onSelect,
}: {
  recentChanges: RecentChangeItem[];
  onSelect: (sourceType: RecentChangeSourceType, id: string) => void;
}) {
  if (recentChanges.length === 0) return null;

  return (
    <section className="project-recent-changes" aria-label="Changé récemment">
      <h2 className="project-pilot-zone-title">Changé récemment</h2>
      <ul className="project-recent-changes-items">
        {recentChanges.map((item) => (
          <li key={item.id}>
            <button type="button" className="project-recent-change-row tap-target" onClick={() => onSelect(item.sourceType, item.id)}>
              <span className="meta-chip">{RECENT_CHANGE_TYPE_LABELS[item.sourceType]}</span>
              <span className="project-recent-change-title">{item.title}</span>
              <span className="project-recent-change-date">{formatChangeDate(item.updatedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
