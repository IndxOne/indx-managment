import type { Action } from "../../domain/types";
import {
  changeWorkspaceApproach,
  createWorkspace,
  editWorkspaceDescription,
  type CreateWorkspaceInput,
  type Workspace,
} from "../../domain/workspace";
import { moveAction, type MoveDestination } from "../../domain/move-action";
import { editActionContent, type ActionContentEdit } from "../../domain/edit-action";
import { addNote } from "../../domain/add-note";
import { linkAction, unlinkAction } from "../../domain/link-action";
import { disableWaitingReminder, setWaitingReminder, triggerWaitingReminderIfDue } from "../../reminders/waiting-reminder";
import { generateRecurringOccurrences, type GenerationWindow, type RecurrenceRule } from "../../recurrence/recurrence-engine";
import type { AppState, CarnetNote, HubSettings, NewActionInput, NewRecurrenceRuleInput } from "./store-context";

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
  | { type: "workspace/editDescription"; workspaceId: string; description: string; now: string }
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
  | { type: "action/undoDelete"; workspaceId: string; action: Action; index: number }
  | { type: "recurrence/create"; rule: RecurrenceRule; window: GenerationWindow }
  | { type: "recurrence/delete"; workspaceId: string; ruleId: string; today: string }
  | { type: "carnet/create"; note: CarnetNote }
  | { type: "carnet/delete"; noteId: string }
  | { type: "carnet/convert"; noteId: string; input: NewActionInput; id: string; now: string }
  | { type: "hub-settings/update"; settings: HubSettings };

export function appReducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "hydrate":
      return event.state;

    case "workspace/create": {
      const workspace = createWorkspace(event.input);
      return {
        ...state,
        workspaces: [...state.workspaces, workspace],
        actionsByWorkspace: { ...state.actionsByWorkspace, [workspace.id]: [] },
        recurrenceRulesByWorkspace: { ...state.recurrenceRulesByWorkspace, [workspace.id]: [] },
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
    case "workspace/editDescription": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === event.workspaceId
            ? editWorkspaceDescription(workspace, event.description, event.now)
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
        sourceNoteId: event.input.sourceNoteId,
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
    case "recurrence/create": {
      const occurrences = generateRecurringOccurrences(event.rule, event.window);
      const existingRules = state.recurrenceRulesByWorkspace[event.rule.workspaceId] ?? [];
      const existingActions = state.actionsByWorkspace[event.rule.workspaceId] ?? [];
      return {
        ...state,
        recurrenceRulesByWorkspace: {
          ...state.recurrenceRulesByWorkspace,
          [event.rule.workspaceId]: [...existingRules, event.rule],
        },
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.rule.workspaceId]: [...existingActions, ...occurrences],
        },
      };
    }
    case "carnet/create": {
      return { ...state, carnetNotes: [...state.carnetNotes, event.note] };
    }
    case "carnet/delete": {
      return { ...state, carnetNotes: state.carnetNotes.filter((note) => note.id !== event.noteId) };
    }
    case "carnet/convert": {
      const input = { ...event.input, sourceNoteId: event.noteId };
      const withAction = appReducer(state, { type: "action/create", input, id: event.id, now: event.now });
      return { ...withAction, carnetNotes: withAction.carnetNotes.filter((note) => note.id !== event.noteId) };
    }
    case "hub-settings/update": {
      return { ...state, hubSettings: event.settings };
    }
    case "recurrence/delete": {
      const existingRules = state.recurrenceRulesByWorkspace[event.workspaceId] ?? [];
      const existingActions = state.actionsByWorkspace[event.workspaceId] ?? [];
      return {
        ...state,
        recurrenceRulesByWorkspace: {
          ...state.recurrenceRulesByWorkspace,
          [event.workspaceId]: existingRules.filter((rule) => rule.id !== event.ruleId),
        },
        actionsByWorkspace: {
          ...state.actionsByWorkspace,
          [event.workspaceId]: existingActions.filter(
            (action) => !isFutureUntouchedOccurrence(action, event.ruleId, event.today)
          ),
        },
      };
    }
    default:
      return state;
  }
}

/**
 * Une occurrence "future non touchée" est encore sûre à effacer en
 * supprimant sa règle : pas commencée (todo), pas déjà passée. Une
 * occurrence déjà en cours, terminée ou en attente reste — l'utilisateur y a
 * déjà interagi, la supprimer perdrait ce travail (cadrage : jamais de perte
 * silencieuse de données sur suppression en cascade).
 */
function isFutureUntouchedOccurrence(action: Action, ruleId: string, today: string): boolean {
  if (action.recurrenceRuleId !== ruleId || action.status !== "todo") return false;
  if (action.schedule?.granularity !== "day") return false;
  return action.schedule.value > today;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function buildRecurrenceRule(input: NewRecurrenceRuleInput): RecurrenceRule {
  return {
    id: generateId(),
    workspaceId: input.workspaceId,
    frequency: input.frequency,
    interval: input.interval,
    startDate: input.startDate,
    endDate: input.endDate,
    template: {
      title: input.title,
      priority: input.priority,
      itemType: input.itemType,
      phaseId: input.phaseId,
      assigneeIds: [],
      tags: [],
    },
  };
}
