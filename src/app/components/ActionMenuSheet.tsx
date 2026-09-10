import type { ReactNode } from "react";
import type { Action } from "../../domain/types";
import { ITEM_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS_DEFAULT } from "../labels";
import { scheduleSummary } from "../utils/schedule-summary";
import { shareAction } from "../utils/share-action";
import { BottomSheet } from "./BottomSheet";
import { IconArrowRight, IconLink, IconMessage, IconPencil, IconShare, IconTrash } from "./Icons";

/**
 * Remplace la rangée de 5 boutons carrés sur la carte (pattern "panneau
 * d'admin web") par un menu d'actions unique — un seul point d'entrée
 * tactile, identique souris/clavier/tactile. Anatomie d'un vrai action
 * sheet iOS : un bloc groupé pour les actions, "Annuler" isolé en dessous.
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
    <BottomSheet title={`Actions - ${action.title}`} onClose={onClose}>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 8px" }}>
        {action.title}
      </p>
      <div className="choice-group" style={{ marginBottom: 8 }}>
        {onOpenNotes && (
          <MenuRow
            chipClass="phase-chip-teal"
            icon={<IconMessage width={18} height={18} />}
            label="Notes"
            sub={noteCount > 0 ? `${noteCount} note${noteCount > 1 ? "s" : ""}` : "Aucune note"}
            onClick={() => run(onOpenNotes)}
          />
        )}
        {onOpenLink && (
          <MenuRow
            chipClass="phase-chip-purple"
            icon={<IconLink width={18} height={18} />}
            label={hasLink ? "Action liée" : "Lier à une autre action"}
            sub={hasLink ? "Une action est liée" : "Aucune liaison"}
            onClick={() => run(onOpenLink)}
          />
        )}
        {onEdit && (
          <MenuRow
            chipClass="phase-chip-blue"
            icon={<IconPencil width={18} height={18} />}
            label="Éditer"
            sub={`${ITEM_TYPE_LABELS[action.itemType]} · ${PRIORITY_LABELS[action.priority]}`}
            onClick={() => run(onEdit)}
          />
        )}
        <MenuRow
          chipClass="phase-chip-orange"
          icon={<IconArrowRight width={18} height={18} />}
          label="Déplacer"
          sub={`${STATUS_LABELS_DEFAULT[action.status]} · ${scheduleSummary(action.schedule)}`}
          onClick={() => run(onMove)}
        />
        <MenuRow
          chipClass="phase-chip-teal"
          icon={<IconShare width={18} height={18} />}
          label="Partager"
          onClick={() => run(() => void shareAction(action))}
        />
        {onDelete && (
          <MenuRow
            chipClass="phase-chip-red"
            icon={<IconTrash width={18} height={18} />}
            label="Supprimer"
            danger
            onClick={() => run(onDelete)}
          />
        )}
      </div>
      <div className="choice-group">
        <button
          type="button"
          className="action-menu-item"
          style={{ justifyContent: "center", fontWeight: 600 }}
          onClick={onClose}
        >
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
}

function MenuRow({
  chipClass,
  icon,
  label,
  sub,
  danger,
  onClick,
}: {
  chipClass: string;
  icon: ReactNode;
  label: string;
  sub?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="action-menu-row" onClick={onClick}>
      <span className={`action-menu-icon ${chipClass}`} aria-hidden="true">
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="action-menu-row-label" style={danger ? { color: "var(--color-danger)" } : undefined}>
          {label}
        </span>
        {sub && <span className="action-menu-row-sub">{sub}</span>}
      </span>
    </button>
  );
}
