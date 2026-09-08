import { useCallback, useRef, useState } from "react";
import { useAnnouncer } from "../a11y/announcer";
import { useStore } from "../adapters/temporary-store";
import type { MoveDestination } from "../../domain/move-action";
import type { Action } from "../../domain/types";

const UNDO_WINDOW_MS = 8000;

/**
 * Encapsule le couple déplacement + proposition d'annulation
 * (cadrage §8 "Annulation proposée après déplacement"), partagé entre
 * l'écran RUN et l'écran PROJET.
 */
export function useMoveWithUndo(workspaceId: string) {
  const { moveActionEvent, restoreAction } = useStore();
  const { announce } = useAnnouncer();
  const [pendingUndo, setPendingUndo] = useState<{ actionId: string; previous: Action } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const move = useCallback(
    (action: Action, destination: MoveDestination) => {
      moveActionEvent(workspaceId, action.id, destination);
      setPendingUndo({ actionId: action.id, previous: action });
      announce(`Action "${action.title}" déplacée.`);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
    },
    [workspaceId, moveActionEvent, announce]
  );

  const cancelLastMove = useCallback(() => {
    if (!pendingUndo) return;
    restoreAction(workspaceId, pendingUndo.previous);
    announce("Déplacement annulé.");
    setPendingUndo(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [pendingUndo, workspaceId, restoreAction, announce]);

  return { pendingUndo, move, cancelLastMove };
}
