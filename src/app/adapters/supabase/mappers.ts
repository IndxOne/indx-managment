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
  notes: ActionNote[] | null;
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
    notes: action.notes ?? null,
    linked_action_id: action.linkedActionId ?? null,
    created_at: action.createdAt,
    updated_at: action.updatedAt,
    completed_at: action.completedAt ?? null,
  };
}
