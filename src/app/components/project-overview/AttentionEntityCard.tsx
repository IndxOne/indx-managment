import { forwardRef } from "react";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Carte compacte réutilisée pour Jalons/WorkItems/Décisions/Risques/Issues
 * (mêmes champs de présentation : titre, statut, échéance, attention). Non
 * interactive dans ce lot (aucune route détail par entité, gate §5) —
 * `needsAttention`/`reason` viennent exclusivement de buildBrief(), jamais
 * recalculés ici (gate §3).
 */
export const AttentionEntityCard = forwardRef<
  HTMLDivElement,
  {
    title: string;
    statusLabel: string;
    dueDate?: string;
    needsAttention: boolean;
    reason?: string;
    extra?: string;
    focused?: boolean;
  }
>(function AttentionEntityCard({ title, statusLabel, dueDate, needsAttention, reason, extra, focused }, ref) {
  return (
    <div
      ref={ref}
      className="brief-item-card"
      data-focused={focused ? "true" : undefined}
      style={{ borderLeftColor: needsAttention ? "var(--color-warning)" : "var(--color-border)" }}
    >
      <div className="brief-item-card-header">
        {needsAttention && (
          <span className="brief-item-card-severity" data-severity="warning">
            À surveiller
          </span>
        )}
        {extra && <span className="meta-chip">{extra}</span>}
      </div>
      <p className="brief-item-card-title">{title}</p>
      {reason && <p className="brief-item-card-reason">{reason}</p>}
      <p className="brief-item-card-meta">
        {dueDate ? `${formatDate(dueDate)} · ` : ""}
        {statusLabel.replace(/_/g, " ")}
      </p>
    </div>
  );
});
