import type { BriefItem } from "../../../domain/v3/brief/types";
import { SOURCE_TYPE_LABELS, SEVERITY_LABELS } from "../../utils/brief-labels";

/** Renforce la sévérité visuellement (bord) — jamais la seule information :
 * le libellé texte (SEVERITY_LABELS) reste toujours affiché à côté. */
const SEVERITY_BORDER_VAR: Record<BriefItem["severity"], string> = {
  blocking: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-border)",
};

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Carte compacte d'un BriefItem — pure présentation, aucune logique de
 * priorisation/inclusion (déjà tranchée par le domaine Brief). ruleId
 * volontairement non affiché ici (réservé à une future vue technique).
 */
export function BriefItemCard({ item, onOpen }: { item: BriefItem; onOpen?: (item: BriefItem) => void }) {
  const content = (
    <>
      <div className="brief-item-card-header">
        <span className="brief-item-card-severity" data-severity={item.severity}>
          {SEVERITY_LABELS[item.severity]}
        </span>
        <span className="meta-chip">{SOURCE_TYPE_LABELS[item.sourceType]}</span>
      </div>
      <p className="brief-item-card-title">{item.title}</p>
      <p className="brief-item-card-reason">{item.reason}</p>
      <p className="brief-item-card-meta">
        {item.dueDate ? `${formatDueDate(item.dueDate)} · ` : ""}
        {item.status.replace(/_/g, " ")}
      </p>
      {item.actionHint && <p className="brief-item-card-action">{item.actionHint}</p>}
    </>
  );

  const borderColor = SEVERITY_BORDER_VAR[item.severity];

  // Sans onOpen : carte non interactive — aucun bouton, aucun tabIndex,
  // aucune affordance de navigation (décision de gate §6).
  if (!onOpen) {
    return (
      <div className="brief-item-card" style={{ borderLeftColor: borderColor }}>
        {content}
      </div>
    );
  }

  // Avec onOpen : <button> natif — active au clic ET à Entrée/Espace sans
  // code additionnel, cible tactile ≥44px via .tap-target, label accessible.
  return (
    <button
      type="button"
      className="brief-item-card brief-item-card-button tap-target"
      style={{ borderLeftColor: borderColor }}
      onClick={() => onOpen(item)}
      aria-label={`${SOURCE_TYPE_LABELS[item.sourceType]} : ${item.title}. ${item.reason}`}
    >
      {content}
    </button>
  );
}
