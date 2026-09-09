import { createContext, useContext } from "react";
import type { Action, ActionStatus, Priority, WorkItemType } from "../../domain/types";
import type { ActionContentEdit } from "../../domain/edit-action";
import type { MoveDestination } from "../../domain/move-action";
import type { CreateWorkspaceInput, Workspace } from "../../domain/workspace";
import type { RecurrenceFrequency, RecurrenceRule } from "../../recurrence/recurrence-engine";

/**
 * Contrat partagé par tous les adaptateurs de persistance (mémoire, Supabase,
 * ...). Les écrans ne connaissent que cette forme : changer d'adaptateur ne
 * demande de toucher qu'App.tsx (cf. cadrage §12, persistance séparée de
 * l'interface).
 */

export interface AppState {
  workspaces: Workspace[];
  actionsByWorkspace: Record<string, Action[]>;
  recurrenceRulesByWorkspace: Record<string, RecurrenceRule[]>;
}

export const EMPTY_STATE: AppState = { workspaces: [], actionsByWorkspace: {}, recurrenceRulesByWorkspace: {} };

export interface NewActionInput {
  workspaceId: string;
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  status?: ActionStatus;
}

export interface NewRecurrenceRuleInput {
  workspaceId: string;
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string;
}

export type NewWorkspaceInput = Omit<CreateWorkspaceInput, "id">;

export interface StoreContextValue {
  state: AppState;
  createWorkspaceAction: (input: NewWorkspaceInput) => Workspace;
  changeApproach: (workspaceId: string, approach: Workspace["approach"]) => void;
  createAction: (input: NewActionInput) => void;
  createRecurringRule: (input: NewRecurrenceRuleInput) => RecurrenceRule;
  deleteRecurringRule: (workspaceId: string, ruleId: string) => void;
  moveActionEvent: (workspaceId: string, actionId: string, destination: MoveDestination) => void;
  restoreAction: (workspaceId: string, action: Action) => void;
  setReminder: (workspaceId: string, actionId: string, afterDays: number) => void;
  disableReminder: (workspaceId: string, actionId: string) => void;
  refreshReminders: (workspaceId: string) => void;
  editAction: (workspaceId: string, actionId: string, edit: ActionContentEdit) => void;
  addNote: (workspaceId: string, actionId: string, text: string) => void;
  linkAction: (workspaceId: string, actionId: string, linkedActionId: string) => void;
  unlinkAction: (workspaceId: string, actionId: string) => void;
  /** Retourne l'action et sa position avant suppression, pour permettre l'annulation. */
  deleteAction: (workspaceId: string, actionId: string) => { action: Action; index: number } | undefined;
  undoDeleteAction: (workspaceId: string, action: Action, index: number) => void;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore doit être utilisé sous StoreProvider");
  }
  return ctx;
}
