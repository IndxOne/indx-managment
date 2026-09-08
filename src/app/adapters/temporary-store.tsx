import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Action, ActionStatus, Priority, WorkItemType } from "../../domain/types";
import {
  changeWorkspaceApproach,
  createWorkspace,
  type CreateWorkspaceInput,
  type Workspace,
} from "../../domain/workspace";
import { moveAction, type MoveDestination } from "../../domain/move-action";
import { disableWaitingReminder, setWaitingReminder, triggerWaitingReminderIfDue } from "../../reminders/waiting-reminder";

/**
 * ADAPTATEUR TEMPORAIRE — Lot 1 (Agent 1) ne fournit que le domaine pur,
 * sans persistance. Ce store en mémoire tient lieu de dépôt de données
 * en attendant le Lot 5 (persistance réelle). Il n'appelle jamais de
 * logique métier lui-même : il délègue systématiquement aux fonctions
 * pures du domaine (createWorkspace, changeWorkspaceApproach, moveAction)
 * pour qu'aucune règle ne soit dupliquée côté UI.
 */

export interface AppState {
  workspaces: Workspace[];
  actionsByWorkspace: Record<string, Action[]>;
}

export const EMPTY_STATE: AppState = { workspaces: [], actionsByWorkspace: {} };

export interface NewActionInput {
  workspaceId: string;
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  status?: ActionStatus;
}

type AppEvent =
  | { type: "workspace/create"; input: CreateWorkspaceInput }
  | { type: "workspace/changeApproach"; workspaceId: string; approach: Workspace["approach"] }
  | { type: "action/create"; input: NewActionInput; id: string; now: string }
  | { type: "action/move"; workspaceId: string; actionId: string; destination: MoveDestination }
  | { type: "action/restore"; workspaceId: string; action: Action }
  | { type: "action/setReminder"; workspaceId: string; actionId: string; afterDays: number }
  | { type: "action/disableReminder"; workspaceId: string; actionId: string }
  | { type: "action/refreshReminders"; workspaceId: string; now: string };

function reducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "workspace/create": {
      const workspace = createWorkspace(event.input);
      return {
        workspaces: [...state.workspaces, workspace],
        actionsByWorkspace: { ...state.actionsByWorkspace, [workspace.id]: [] },
      };
    }
    case "workspace/changeApproach": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === event.workspaceId
            ? changeWorkspaceApproach(workspace, event.approach)
            : workspace
        ),
      };
    }
    case "action/create": {
      const action: Action = {
        id: event.id,
        workspaceId: event.input.workspaceId,
        title: event.input.title,
        status: event.input.status ?? "todo",
        priority: event.input.priority,
        itemType: event.input.itemType,
        phaseId: event.input.phaseId,
        schedule: { granularity: "none" },
        assigneeIds: [],
        tags: [],
        createdAt: event.now,
        updatedAt: event.now,
      };
      const existing = state.actionsByWorkspace[event.input.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.input.workspaceId]: [...existing, action],
        },
      };
    }
    case "action/move": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? moveAction(action, event.destination) : action
          ),
        },
      };
    }
    case "action/restore": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.action.id ? event.action : action
          ),
        },
      };
    }
    case "action/setReminder": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? setWaitingReminder(action, event.afterDays) : action
          ),
        },
      };
    }
    case "action/disableReminder": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? disableWaitingReminder(action) : action
          ),
        },
      };
    }
    case "action/refreshReminders": {
      // Enregistre l'historique de déclenchement pour les relances devenues
      // dues depuis le dernier rendu (idempotent, cf. triggerWaitingReminderIfDue).
      // MVP sans ordonnanceur serveur : vérifié à chaque affichage de l'espace
      // RUN, pas en tâche de fond (Lot 5 pour un vrai déclenchement planifié).
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      const now = new Date(event.now);
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) => triggerWaitingReminderIfDue(action, now)),
        },
      };
    }
    default:
      return state;
  }
}

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export type NewWorkspaceInput = Omit<CreateWorkspaceInput, "id">;

interface StoreContextValue {
  state: AppState;
  createWorkspaceAction: (input: NewWorkspaceInput) => Workspace;
  changeApproach: (workspaceId: string, approach: Workspace["approach"]) => void;
  createAction: (input: NewActionInput) => void;
  moveActionEvent: (workspaceId: string, actionId: string, destination: MoveDestination) => void;
  restoreAction: (workspaceId: string, action: Action) => void;
  setReminder: (workspaceId: string, actionId: string, afterDays: number) => void;
  disableReminder: (workspaceId: string, actionId: string) => void;
  refreshReminders: (workspaceId: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({
  children,
  initialState = EMPTY_STATE,
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      createWorkspaceAction: (input) => {
        const withId: CreateWorkspaceInput = {
          ...input,
          id: generateId("ws"),
          now: input.now ?? new Date().toISOString(),
        };
        dispatch({ type: "workspace/create", input: withId });
        return createWorkspace(withId); // même entrée figée -> résultat identique, pour la navigation immédiate
      },
      changeApproach: (workspaceId, approach) =>
        dispatch({ type: "workspace/changeApproach", workspaceId, approach }),
      createAction: (input) =>
        dispatch({ type: "action/create", input, id: generateId("act"), now: new Date().toISOString() }),
      moveActionEvent: (workspaceId, actionId, destination) =>
        dispatch({ type: "action/move", workspaceId, actionId, destination }),
      restoreAction: (workspaceId, action) => dispatch({ type: "action/restore", workspaceId, action }),
      setReminder: (workspaceId, actionId, afterDays) =>
        dispatch({ type: "action/setReminder", workspaceId, actionId, afterDays }),
      disableReminder: (workspaceId, actionId) =>
        dispatch({ type: "action/disableReminder", workspaceId, actionId }),
      refreshReminders: (workspaceId) =>
        dispatch({ type: "action/refreshReminders", workspaceId, now: new Date().toISOString() }),
    }),
    [state]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore doit être utilisé sous StoreProvider");
  }
  return ctx;
}
