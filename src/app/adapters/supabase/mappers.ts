import type {
  Action,
  ActionNote,
  ActionStatus,
  Priority,
  ProfessionalApproach,
  Schedule,
  WorkItemType,
  WorkspaceKind,
} from "../../../domain/types";
import type { CollaborationMode } from "../../../domain/types";
import type { Workspace } from "../../../domain/workspace";
import type { WaitingReminderRule } from "../../../reminders/waiting-reminder";
import type { RecurrenceFrequency, RecurrenceRule } from "../../../recurrence/recurrence-engine";
import type { CarnetNote, HubSettings } from "../store-context";


/**
 * Conversion ligne Postgres (snake_case) <-> domaine (camelCase). Les
 * contraintes CHECK côté base garantissent déjà la validité des enums :
 * un simple `as` suffit ici, la vraie validation vit dans le domaine
 * (Agent 1), jamais dupliquée côté adaptateur.
 */

export interface WorkspaceRow {
  id: string;
  user_hash: string;
  name: string;
  description: string | null;
  kind: string;
  approach: string;
  collaboration_mode: string;
  preset_version: number;
  created_at: string;
  updated_at: string;
}

export interface ActionRow {
  id: string;
  user_hash: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  item_type: string;
  phase_id: string | null;
  schedule: Schedule;
  assignee_ids: string[];
  tags: string[];
  source_note_id: string | null;
  recurrence_rule_id: string | null;
  waiting_since: string | null;
  waiting_reminder: WaitingReminderRule | null;
  notes: ActionNote[];
  linked_action_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function workspaceFromRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    kind: row.kind as WorkspaceKind,
    approach: row.approach as ProfessionalApproach,
    collaborationMode: row.collaboration_mode as CollaborationMode,
    presetVersion: row.preset_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function workspaceToRow(workspace: Workspace, userHash: string): WorkspaceRow {
  return {
    id: workspace.id,
    user_hash: userHash,
    name: workspace.name,
    description: workspace.description ?? null,
    kind: workspace.kind,
    approach: workspace.approach,
    collaboration_mode: workspace.collaborationMode,
    preset_version: workspace.presetVersion,
    created_at: workspace.createdAt,
    updated_at: workspace.updatedAt,
  };
}

export interface RecurrenceRuleRow {
  id: string;
  user_hash: string;
  workspace_id: string;
  frequency: string;
  interval: number;
  start_date: string;
  end_date: string | null;
  phase_id: string | null;
  title: string;
  priority: string;
  item_type: string;
  created_at: string;
}

export function recurrenceRuleFromRow(row: RecurrenceRuleRow): RecurrenceRule {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    frequency: row.frequency as RecurrenceFrequency,
    interval: row.interval,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    template: {
      title: row.title,
      priority: row.priority as Priority,
      itemType: row.item_type as WorkItemType,
      phaseId: row.phase_id ?? undefined,
      assigneeIds: [],
      tags: [],
    },
  };
}

export function recurrenceRuleToRow(rule: RecurrenceRule, userHash: string): Omit<RecurrenceRuleRow, "created_at"> {
  return {
    id: rule.id,
    user_hash: userHash,
    workspace_id: rule.workspaceId,
    frequency: rule.frequency,
    interval: rule.interval,
    start_date: rule.startDate,
    end_date: rule.endDate ?? null,
    phase_id: rule.template.phaseId ?? null,
    title: rule.template.title,
    priority: rule.template.priority,
    item_type: rule.template.itemType,
  };
}

export interface CarnetNoteRow {
  id: string;
  user_hash: string;
  text: string;
  created_at: string;
}

export function carnetNoteFromRow(row: CarnetNoteRow): CarnetNote {
  return { id: row.id, text: row.text, createdAt: row.created_at };
}

export function carnetNoteToRow(note: CarnetNote, userHash: string): CarnetNoteRow {
  return { id: note.id, user_hash: userHash, text: note.text, created_at: note.createdAt };
}

export interface HubSettingsRow {
  user_hash: string;
  monthly_objective: number | null;
  daily_rate: number | null;
  treasury_forecast: number | null;
  updated_at: string;
}

export function hubSettingsFromRow(row: HubSettingsRow): HubSettings {
  return {
    monthlyObjective: row.monthly_objective,
    dailyRate: row.daily_rate,
    treasuryForecast: row.treasury_forecast,
  };
}

export function hubSettingsToRow(settings: HubSettings, userHash: string, now: string): HubSettingsRow {
  return {
    user_hash: userHash,
    monthly_objective: settings.monthlyObjective,
    daily_rate: settings.dailyRate,
    treasury_forecast: settings.treasuryForecast,
    updated_at: now,
  };
}

export function actionFromRow(row: ActionRow): Action {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as ActionStatus,
    priority: row.priority as Priority,
    itemType: row.item_type as WorkItemType,
    phaseId: row.phase_id ?? undefined,
    schedule: row.schedule ?? { granularity: "none" },
    assigneeIds: row.assignee_ids ?? [],
    tags: row.tags ?? [],
    sourceNoteId: row.source_note_id ?? undefined,
    recurrenceRuleId: row.recurrence_rule_id ?? undefined,
    waitingSince: row.waiting_since ?? undefined,
    waitingReminder: row.waiting_reminder ?? undefined,
    notes: row.notes && row.notes.length > 0 ? row.notes : undefined,
    linkedActionId: row.linked_action_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export function actionToRow(action: Action, userHash: string): ActionRow {
  return {
    id: action.id,
    user_hash: userHash,
    workspace_id: action.workspaceId,
    title: action.title,
    description: action.description ?? null,
    status: action.status,
    priority: action.priority,
    item_type: action.itemType,
    phase_id: action.phaseId ?? null,
    schedule: action.schedule ?? { granularity: "none" },
    assignee_ids: action.assigneeIds,
    tags: action.tags,
    source_note_id: action.sourceNoteId ?? null,
    recurrence_rule_id: action.recurrenceRuleId ?? null,
    waiting_since: action.waitingSince ?? null,
    waiting_reminder: action.waitingReminder ?? null,
    notes: action.notes ?? [],
    linked_action_id: action.linkedActionId ?? null,
    created_at: action.createdAt,
    updated_at: action.updatedAt,
    completed_at: action.completedAt ?? null,
  };
}
