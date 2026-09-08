import type { Action } from "../../domain/types";
import { changeWorkspaceApproach, createWorkspace, type CreateWorkspaceInput, type Workspace } from "../../domain/workspace";
import { moveAction, type MoveDestination } from "../../domain/move-action";
import { editActionContent, type ActionContentEdit } from "../../domain/edit-action";
import { addNote } from "../../domain/add-note";
import { linkAction, unlinkAction } from "../../domain/link-action";
import { disableWaitingReminder, setWaitingReminder, triggerWaitingReminderIfDue } from "../../reminders/waiting-reminder";
import type { AppState, NewActionInput } from "./store-context";

/**
 * Réducteur pur partagé par tous les adaptateurs (mémoire, Supabase, ...).
 * Ne contient aucune logique d'E/S : uniquement de la mise à jour d'état
 * locale via les fonctions pures du domaine. Chaque adaptateur décide
 * séparément s'il persiste l'événement quelque part (cf. supabase-store.tsx).
 */

export type AppEvent =
  | { type: "hydrate"; state: AppState }
  | { type: "workspace/create"; input: CreateWorkspaceInput }
  | { type: "workspace/changeApproach"; workspaceId: string; approach: Workspace["approach"] }
  | { type: "action/create"; input: NewActionInput; id: string; now: string }
  | { type: "action/move"; workspaceId: string; actionId: string; destination: MoveDestination }
  | { type: "action/restore"; workspaceId: string; action: Action }
  | { type: "action/setReminder"; workspaceId: string; actionId: string; afterDays: number }
  | { type: "action/disableReminder"; workspaceId: string; actionId: string }
  | { type: "action/refreshReminders"; workspaceId: string; now: string }
  | { type: "action/edit"; workspaceId: string; actionId: string; edit: ActionContentEdit; now: string }
  | { type: "action/addNote"; workspaceId: string; actionId: string; noteId: string; text: string; now: string }
  | { type: "action/link"; workspaceId: string; actionId: string; linkedActionId: string; now: string }
  | { type: "action/unlink"; workspaceId: string; actionId: string; now: string }
  | { type: "action/delete"; workspaceId: string; actionId: string }
  | { type: "action/undoDelete"; workspaceId: string; action: Action; index: number };

export function appReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "hydrate":
      return event.state;

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
    case "action/edit": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? editActionContent(action, event.edit, event.now) : action
          ),
        },
      };
    }
    case "action/addNote": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? addNote(action, event.noteId, event.text, event.now) : action
          ),
        },
      };
    }
    case "action/link": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? linkAction(action, event.linkedActionId, event.now) : action
          ),
        },
      };
    }
    case "action/unlink": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.map((action) =>
            action.id === event.actionId ? unlinkAction(action, event.now) : action
          ),
        },
      };
    }
    case "action/delete": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existing.filter((action) => action.id !== event.actionId),
        },
      };
    }
    case "action/undoDelete": {
      const existing = state.actionsByWorkspace[event.workspaceId] ?? [];
      const insertAt = Math.min(Math.max(event.index, 0), existing.length);
      const restored = [...existing.slice(0, insertAt), event.action, ...existing.slice(insertAt)];
      return {
        ...state,
        actionsByWorkspace: { ...state.actionsByWorkspace, [event.workspaceId]: restored },
      };
    }
    default:
      return state;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}
