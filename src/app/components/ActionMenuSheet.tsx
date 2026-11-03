import type { ReactNode } from "react";
import type { Action } from "../../domain/types";
import { ITEM_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS_DEFAULT } from "../labels";
import { scheduleSummary } from "../utils/schedule-summary";
import { shareAction } from "../utils/share-action";
import { BottomSheet } from "./BottomSheet";
import { IconArrowRight, IconLink, IconMessage, IconPencil, IconShare } from "./Icons";

/**
 * Menu d'une action, réduit à l'essentiel pour un usage quotidien :
 * 3 gestes courants en grand (statut/date, modifier, notes), les options
 * rares (lier, partager) en petits boutons, Supprimer isolé en bas.
 * Fermeture : croix, fond ou geste retour — pas de bouton "Annuler" en plus.
 */
export function ActionMenuSheet({
  action,
  noteCount,
  hasLink,
  onClose,
  onEdit,
  onMove,
  onDelete,
  onOpenNotes,
  onOpenLink,
}: {
  action: Action;
  noteCount: number;
  hasLink: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onMove: () => void;
  onDelete?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
}) {
  function run(handler: () => void) {
    handler();
    onClose();
  }

  return (
    <BottomSheet title={action.title} onClose={onClose}>
      <div className="choice-group">
        <MenuRow
          icon={<IconArrowRight width={18} height={18} />}
          label="Statut et date"
          sub={`${STATUS_LABELS_DEFAULT[action.status]} · ${scheduleSummary(action.schedule)}`}
          onClick={() => run(onMove)}
        />
        {onEdit && (
          <MenuRow
            icon={<IconPencil width={18} height={18} />}
            label="Modifier"
            sub={`${ITEM_TYPE_LABELS[action.itemType]} · ${PRIORITY_LABELS[action.priority]}`}
            onClick={() => run(onEdit)}
          />
        )}
        {onOpenNotes && (
          <MenuRow
            icon={<IconMessage width={18} height={18} />}
            label="Notes"
            sub={noteCount > 0 ? `${noteCount} note${noteCount > 1 ? "s" : ""}` : "Ajouter une note"}
            onClick={() => run(onOpenNotes)}
          />
        )}
      </div>

      <div className="action-menu-secondary">
        {onOpenLink && (
          <button type="button" className="btn btn-small" onClick={() => run(onOpenLink)}>
            <IconLink width={16} height={16} aria-hidden="true" />
            {hasLink ? "Action liée" : "Lier"}
          </button>
        )}
        <button type="button" className="btn btn-small" onClick={() => run(() => void shareAction(action))}>
          <IconShare width={16} height={16} aria-hidden="true" />
          Partager
        </button>
        {onDelete && (
          <button type="button" className="btn btn-small btn-danger-text action-menu-delete" onClick={() => run(onDelete)}>
            Supprimer
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function MenuRow({ icon, label, sub, onClick }: { icon: ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="action-menu-row" onClick={onClick}>
      <span className="action-menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="action-menu-row-label">{label}</span>
        <span className="action-menu-row-sub">{sub}</span>
      </span>
    </button>
  );
}
