import { useMemo, useReducer, type ReactNode } from "react";
import type { CreateWorkspaceInput } from "../../domain/workspace";
import { createWorkspace } from "../../domain/workspace";
import { appReducer, generateId } from "./app-reducer";
import {
  StoreContext,
  EMPTY_STATE,
  type AppState,
  type NewActionInput,
  type NewWorkspaceInput,
  type StoreContextValue,
} from "./store-context";

export { EMPTY_STATE };
export type { AppState, NewActionInput, NewWorkspaceInput };

/**
 * ADAPTATEUR EN MÉMOIRE — repli sans persistance, utilisé quand Supabase
 * n'est pas configuré (dev sans .env, tests) et par les tests composants.
 * Voir supabase-store.tsx pour la persistance réelle (Lot 5).
 */
export function TemporaryStoreProvider({
  children,
  initialState = EMPTY_STATE,
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      createWorkspaceAction: (input) => {
        const withId: CreateWorkspaceInput = {
          ...input,
          id: generateId(),
          now: input.now ?? new Date().toISOString(),
        };
        dispatch({ type: "workspace/create", input: withId });
        return createWorkspace(withId); // même entrée figée -> résultat identique, pour la navigation immédiate
      },
      changeApproach: (workspaceId, approach) =>
        dispatch({ type: "workspace/changeApproach", workspaceId, approach }),
      createAction: (input) =>
        dispatch({ type: "action/create", input, id: generateId(), now: new Date().toISOString() }),
      moveActionEvent: (workspaceId, actionId, destination) =>
        dispatch({ type: "action/move", workspaceId, actionId, destination }),
      restoreAction: (workspaceId, action) => dispatch({ type: "action/restore", workspaceId, action }),
      setReminder: (workspaceId, actionId, afterDays) =>
        dispatch({ type: "action/setReminder", workspaceId, actionId, afterDays }),
      disableReminder: (workspaceId, actionId) =>
        dispatch({ type: "action/disableReminder", workspaceId, actionId }),
      refreshReminders: (workspaceId) =>
        dispatch({ type: "action/refreshReminders", workspaceId, now: new Date().toISOString() }),
      editAction: (workspaceId, actionId, edit) =>
        dispatch({ type: "action/edit", workspaceId, actionId, edit, now: new Date().toISOString() }),
      deleteAction: (workspaceId, actionId) => {
        const list = state.actionsByWorkspace[workspaceId] ?? [];
        const index = list.findIndex((action) => action.id === actionId);
        const action = index === -1 ? undefined : list[index];
        if (!action) return undefined;
        dispatch({ type: "action/delete", workspaceId, actionId });
        return { action, index };
      },
      undoDeleteAction: (workspaceId, action, index) =>
        dispatch({ type: "action/undoDelete", workspaceId, action, index }),
    }),
    [state]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Alias conservé pour compatibilité (tests, imports existants). */
export { TemporaryStoreProvider as StoreProvider };
export { useStore } from "./store-context";
