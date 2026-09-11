import { useCallback } from "react";
import type { Action } from "../../domain/types";
import { useStore } from "../adapters/store-context";

/**
 * Résolveur pour `ActionListSection.resolveSyncStatus` (badge de sync par
 * carte, Lot 3 §2) — dérivé de `pendingActionIds`/`conflicts` exposés par
 * le store. Vit dans un hook plutôt que dans `ActionListSection` lui-même
 * pour garder ce composant testable sans `StoreProvider` (cf. ses tests).
 */
export function useActionSyncStatus(): (action: Action) => "pending" | "conflict" | undefined {
  const { pendingActionIds, conflicts } = useStore();

  return useCallback(
    (action: Action) => {
      if (conflicts.some((conflict) => conflict.actionId === action.id)) return "conflict";
      if (pendingActionIds.includes(action.id)) return "pending";
      return undefined;
    },
    [pendingActionIds, conflicts]
  );
}
