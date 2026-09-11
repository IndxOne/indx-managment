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

export interface CarnetNote {
  id: string;
  text: string;
  createdAt: string;
}

/**
 * Repères business déclaratifs affichés dans le Hub (objectif mensuel, TJM
 * de référence, trésorerie prévue) — saisis à la main, jamais calculés :
 * aucune notion d'action "facturée" n'existe dans le modèle actuel.
 */
export interface HubSettings {
  monthlyObjective: number | null;
  dailyRate: number | null;
  treasuryForecast: number | null;
}

export interface AppState {
  workspaces: Workspace[];
  actionsByWorkspace: Record<string, Action[]>;
  recurrenceRulesByWorkspace: Record<string, RecurrenceRule[]>;
  carnetNotes: CarnetNote[];
  /** Absent tant que l'utilisateur n'a jamais renseigné ces repères. */
  hubSettings?: HubSettings;
}

export const EMPTY_STATE: AppState = {
  workspaces: [],
  actionsByWorkspace: {},
  recurrenceRulesByWorkspace: {},
  carnetNotes: [],
};

export interface NewActionInput {
  workspaceId: string;
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  status?: ActionStatus;
  /** Présent quand l'action provient d'une note du Carnet convertie. */
  sourceNoteId?: string;
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

/**
 * Conflit détecté en retentant une mutation d'action après une coupure
 * réseau : le serveur a une version plus récente que celle dont partait la
 * mutation locale en attente. Jamais résolu automatiquement (pas de
 * "dernière écriture gagne" silencieuse) — l'utilisateur choisit.
 */
export interface SyncConflict {
  key: string;
  actionId: string;
  actionTitle: string;
  /** Écrase la version serveur avec la mutation locale en attente. */
  onKeepLocal: () => void;
  /** Abandonne la mutation locale en attente et recharge depuis Supabase. */
  onDiscardLocal: () => void;
}

export interface StoreContextValue {
  state: AppState;
  /** Nombre de mutations pas encore confirmées synchronisées (créé/modifié en attente d'écriture Supabase). */
  pendingSyncCount: number;
  /** Conflits détectés au retry, en attente d'un choix explicite (cf. SyncConflict). */
  conflicts: SyncConflict[];
  createWorkspaceAction: (input: NewWorkspaceInput) => Workspace;
  changeApproach: (workspaceId: string, approach: Workspace["approach"]) => void;
  /** Retourne une promesse pour permettre à l'appelant de distinguer succès et échec (retry côté UI). */
  editWorkspaceDescription: (workspaceId: string, description: string) => Promise<void>;
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
  createCarnetNote: (text: string) => CarnetNote;
  deleteCarnetNote: (noteId: string) => void;
  /** Crée l'action à partir du texte de la note puis retire la note du Carnet (triage). */
  convertCarnetNote: (noteId: string, input: Omit<NewActionInput, "sourceNoteId">) => void;
  /** Retourne une promesse pour permettre à l'appelant de distinguer succès et échec (retry côté UI). */
  updateHubSettings: (settings: HubSettings) => Promise<void>;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore doit être utilisé sous StoreProvider");
  }
  return ctx;
}
