import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefItemCard } from "../brief/BriefItemCard";

/**
 * Zone "À surveiller" (UX-5.2) — jusqu'à 3 éléments suivants de
 * `brief.attentionItems` (le focus déjà affiché dans "Maintenant" en est
 * exclu), même ordre de priorité, aucune nouvelle requête. Masquée
 * entièrement si vide — jamais une grande section vide (§2 CLAUDE_TASK.md).
 * Cartes non interactives (même convention que "Maintenant") : un seul CTA
 * "Voir tout dans Mon Brief" porte la navigation, jamais les cartes
 * elles-mêmes.
 */
export function ProjectWatchList({ watchItems, onOpenBrief }: { watchItems: BriefItem[]; onOpenBrief: () => void }) {
  if (watchItems.length === 0) return null;

  return (
    <section className="project-watch-list" aria-label="À surveiller">
      <h2 className="project-pilot-zone-title">À surveiller</h2>
      <ul className="project-watch-list-items">
        {watchItems.map((item) => (
          <li key={item.id}>
            <BriefItemCard item={item} />
          </li>
        ))}
      </ul>
      <button type="button" className="project-focus-now-cta tap-target" onClick={onOpenBrief}>
        Voir tout dans Mon Brief
      </button>
    </section>
  );
}
