import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefItemCard } from "../brief/BriefItemCard";

/**
 * Zone "Focus maintenant" (UX-5.1) — remplace la grille de 6 KPI et les 6
 * sections empilées en tête d'écran par un seul élément : le plus
 * prioritaire de `brief.attentionItems`, déjà calculé par
 * buildProjectOverview() (aucun recalcul, aucune nouvelle requête).
 * Réutilise BriefItemCard tel quel (même vocabulaire visuel que Mon Brief),
 * en carte non interactive : le CTA de navigation ("Voir dans Mon Brief")
 * est un bouton séparé et explicite, jamais la carte elle-même — sinon son
 * nom accessible (type/titre/raison) et son `actionHint` visible ("Assigner
 * un responsable"...) laissent croire à tort qu'activer la carte résout
 * l'item sur place, alors qu'elle renvoie vers Mon Brief (correctif review
 * Codex, aucune route détail par entité, décision de gate déjà actée).
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
        <div className="project-focus-now-card">
          <BriefItemCard item={focusItem} focused={focused} />
          <button type="button" className="project-focus-now-cta tap-target" onClick={onOpenBrief}>
            Voir dans Mon Brief
          </button>
        </div>
      ) : (
        <p className="project-focus-now-empty">Rien de critique à traiter maintenant.</p>
      )}
    </section>
  );
}
