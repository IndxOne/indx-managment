import { useCallback, useRef, useState } from "react";
import { useAnnouncer } from "../a11y/announcer";
import { useStore } from "../adapters/temporary-store";
import type { Action } from "../../domain/types";

const UNDO_WINDOW_MS = 8000;

/**
 * Supprime une action avec proposition d'annulation immédiate (même
 * fenêtre que le déplacement), pour couvrir "suppression/annulation" de
 * la checklist de non-régression. workspaceId pris par appel (pas à la
 * construction) pour rester utilisable depuis une vue transversale
 * (Aujourd'hui/Semaine) où chaque action vient d'un espace différent.
 */
export function useDeleteWithUndo() {
  const { deleteAction, undoDeleteAction } = useStore();
  const { announce } = useAnnouncer();
  const [pendingUndo, setPendingUndo] = useState<{ workspaceId: string; action: Action; index: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remove = useCallback(
    (workspaceId: string, action: Action) => {
      const removed = deleteAction(workspaceId, action.id);
      if (!removed) return;
      setPendingUndo({ workspaceId, ...removed });
      announce(`Action "${action.title}" supprimée.`);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
    },
    [deleteAction, announce]
  );

  const cancelLastDelete = useCallback(() => {
    if (!pendingUndo) return;
    undoDeleteAction(pendingUndo.workspaceId, pendingUndo.action, pendingUndo.index);
    announce("Suppression annulée.");
    setPendingUndo(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [pendingUndo, undoDeleteAction, announce]);

  return { pendingUndo, remove, cancelLastDelete };
}
