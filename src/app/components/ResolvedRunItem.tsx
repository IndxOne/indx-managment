import type { Member } from "../../domain/member";
import type { Action } from "../../domain/types";

/**
 * Rangée compacte pour une action RUN résolue (cadrage "RUN resolved") :
 * perd volontairement toute l'info secondaire de la carte active (chips,
 * description, pied de carte) — juste un badge "Résolu", le titre tronqué
 * et, si connu, le responsable et la date de résolution. Reste consultable
 * (clic ouvre le détail complet) sans polluer la densité de la file active.
 */
export function ResolvedRunItem({
  action,
  assignedMember,
  onOpenDetail,
  onReopen,
}: {
  action: Action;
  /** Premier responsable résolu (Lot 8B), si l'espace est en mode Équipe. */
  assignedMember?: Member;
  onOpenDetail?: () => void;
  /** Alternative non gestuelle pour rouvrir une action résolue par erreur — toujours visible, jamais seulement via un menu caché. */
  onReopen?: () => void;
}) {
  const resolvedLabel = action.completedAt
    ? new Date(action.completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : null;

  const content = (
    <>
      <span className="resolved-run-badge">Résolu</span>
      <span className="resolved-run-title">{action.title}</span>
      {(assignedMember || resolvedLabel) && (
        <span className="resolved-run-meta">
          {assignedMember?.displayName}
          {assignedMember && resolvedLabel ? " · " : ""}
          {resolvedLabel}
        </span>
      )}
    </>
  );

  return (
    <li className="resolved-run-item">
      {onOpenDetail ? (
        <button type="button" className="resolved-run-item-open" onClick={onOpenDetail}>
          {content}
        </button>
      ) : (
        <div className="resolved-run-item-open">{content}</div>
      )}
      {onReopen && (
        <button type="button" className="btn tap-target" onClick={onReopen} aria-label={`Réouvrir "${action.title}"`}>
          Réouvrir
        </button>
      )}
    </li>
  );
}
