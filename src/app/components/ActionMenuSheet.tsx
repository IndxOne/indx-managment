import type { Action } from "../../domain/types";
import { BottomSheet } from "./BottomSheet";
import { IconArrowRight, IconLink, IconMessage, IconPencil, IconTrash } from "./Icons";

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
          <button type="button" className="action-menu-item" onClick={() => run(onOpenNotes)}>
            <IconMessage /> Notes{noteCount > 0 ? ` (${noteCount})` : ""}
          </button>
        )}
        {onOpenLink && (
          <button type="button" className="action-menu-item" onClick={() => run(onOpenLink)}>
            <IconLink /> {hasLink ? "Action liée" : "Lier à une autre action"}
          </button>
        )}
        {onEdit && (
          <button type="button" className="action-menu-item" onClick={() => run(onEdit)}>
            <IconPencil /> Éditer
          </button>
        )}
        <button type="button" className="action-menu-item" onClick={() => run(onMove)}>
          <IconArrowRight /> Déplacer
        </button>
        {onDelete && (
          <button type="button" className="action-menu-item action-menu-item-danger" onClick={() => run(onDelete)}>
            <IconTrash /> Supprimer
          </button>
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
