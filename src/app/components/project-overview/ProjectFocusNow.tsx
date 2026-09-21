import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefItemCard } from "../brief/BriefItemCard";

/**
 * Zone "Focus maintenant" (UX-5.1) — remplace la grille de 6 KPI et les 6
 * sections empilées en tête d'écran par un seul élément : le plus
 * prioritaire de `brief.attentionItems`, déjà calculé par
 * buildProjectOverview() (aucun recalcul, aucune nouvelle requête).
 * Réutilise BriefItemCard tel quel (même vocabulaire visuel que Mon Brief),
 * seul le libellé du CTA change ("Voir dans Mon Brief" : aucune route
 * détail par entité, décision de gate déjà actée et préservée ici).
 */
export function ProjectFocusNow({
  focusItem,
  focused,
  onOpenBrief,
}: {
  focusItem: BriefItem | undefined;
  /** Deep-link (focusType/focusId) ciblant exactement cet item — §7. */
  focused: boolean;
  onOpenBrief: () => void;
}) {
  return (
    <section className="project-focus-now" aria-label="Focus maintenant">
      <h2 className="project-pilot-zone-title">Maintenant</h2>
      {focusItem ? (
        <BriefItemCard item={focusItem} onOpen={onOpenBrief} focused={focused} />
      ) : (
        <p className="project-focus-now-empty">Rien de critique à traiter maintenant.</p>
      )}
    </section>
  );
}
