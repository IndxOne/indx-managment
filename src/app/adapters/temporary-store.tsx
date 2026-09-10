import { useMemo, useReducer, type ReactNode } from "react";
import type { CreateWorkspaceInput } from "../../domain/workspace";
import { createWorkspace } from "../../domain/workspace";
import { defaultMaterializationWindow } from "../../recurrence/recurrence-engine";
import { appReducer, buildRecurrenceRule, generateId } from "./app-reducer";
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
      editWorkspaceDescription: (workspaceId, description) => {
        dispatch({ type: "workspace/editDescription", workspaceId, description, now: new Date().toISOString() });
        return Promise.resolve();
      },
      createAction: (input) =>
        dispatch({ type: "action/create", input, id: generateId(), now: new Date().toISOString() }),
      createRecurringRule: (input) => {
        const rule = buildRecurrenceRule(input);
        const today = new Date().toISOString().slice(0, 10);
        dispatch({ type: "recurrence/create", rule, window: defaultMaterializationWindow(rule, today) });
        return rule;
      },
      deleteRecurringRule: (workspaceId, ruleId) =>
        dispatch({ type: "recurrence/delete", workspaceId, ruleId, today: new Date().toISOString().slice(0, 10) }),
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
      addNote: (workspaceId, actionId, text) =>
        dispatch({ type: "action/addNote", workspaceId, actionId, noteId: generateId(), text, now: new Date().toISOString() }),
      linkAction: (workspaceId, actionId, linkedActionId) =>
        dispatch({ type: "action/link", workspaceId, actionId, linkedActionId, now: new Date().toISOString() }),
      unlinkAction: (workspaceId, actionId) =>
        dispatch({ type: "action/unlink", workspaceId, actionId, now: new Date().toISOString() }),
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
      createCarnetNote: (text) => {
        const note = { id: generateId(), text, createdAt: new Date().toISOString() };
        dispatch({ type: "carnet/create", note });
        return note;
      },
      deleteCarnetNote: (noteId) => dispatch({ type: "carnet/delete", noteId }),
      convertCarnetNote: (noteId, input) =>
        dispatch({ type: "carnet/convert", noteId, input, id: generateId(), now: new Date().toISOString() }),
      updateHubSettings: (settings) => {
        dispatch({ type: "hub-settings/update", settings });
        return Promise.resolve();
      },
    }),
    [state]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Alias conservé pour compatibilité (tests, imports existants). */
export { TemporaryStoreProvider as StoreProvider };
export { useStore } from "./store-context";
