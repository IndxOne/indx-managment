import type { Action } from "../../domain/types";
import { BottomSheet } from "./BottomSheet";
import { IconArrowRight, IconLink, IconMessage, IconPencil, IconTrash } from "./Icons";

/**
 * Remplace la rangée de 5 boutons carrés sur la carte (pattern "panneau
 * d'admin web") par un menu d'actions unique — un seul point d'entrée
 * tactile, identique souris/clavier/tactile.
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
    <BottomSheet title={`Actions — ${action.title}`} onClose={onClose}>
      <p style={{ fontWeight: 600 }}>{action.title}</p>
      <div className="choice-group">
        {onOpenNotes && (
          <button type="button" className="btn btn-block tap-target action-menu-item" onClick={() => run(onOpenNotes)}>
            <IconMessage /> Notes{noteCount > 0 ? ` (${noteCount})` : ""}
          </button>
        )}
        {onOpenLink && (
          <button type="button" className="btn btn-block tap-target action-menu-item" onClick={() => run(onOpenLink)}>
            <IconLink /> {hasLink ? "Action liée" : "Lier à une autre action"}
          </button>
        )}
        {onEdit && (
          <button type="button" className="btn btn-block tap-target action-menu-item" onClick={() => run(onEdit)}>
            <IconPencil /> Éditer
          </button>
        )}
        <button type="button" className="btn btn-block tap-target action-menu-item" onClick={() => run(onMove)}>
          <IconArrowRight /> Déplacer
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn btn-block tap-target action-menu-item action-menu-item-danger"
            onClick={() => run(onDelete)}
          >
            <IconTrash /> Supprimer
          </button>
        )}
      </div>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 16 }} onClick={onClose}>
        Annuler
      </button>
    </BottomSheet>
  );
}
