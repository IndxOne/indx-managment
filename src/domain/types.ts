export type WorkspaceKind = "run" | "project";

export type ProfessionalApproach =
  | "simple"
  | "it_ops"
  | "project_amoa"
  | "product_tech"
  | "management";

export type CollaborationMode = "solo" | "team";

export type ActionStatus = "todo" | "doing" | "waiting" | "done";

export type Priority = "high" | "normal" | "low";

export type WorkItemType =
  | "task"
  | "request"
  | "incident"
  | "maintenance"
  | "deliverable"
  | "milestone";

/**
 * Un seul champ de planification par action : la granularité choisie porte
 * seule la valeur. Élimine les champs contradictoires dueDate/week/month
 * du prototype (cadrage §6).
 */
export type Schedule =
  | { granularity: "day"; value: string } // YYYY-MM-DD
  | { granularity: "week"; value: string } // YYYY-Www (ISO 8601)
  | { granularity: "month"; value: string } // YYYY-MM
  | { granularity: "none" };

export interface Action {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: Priority;
  itemType: WorkItemType;
  phaseId?: string;
  schedule?: Schedule;
  assigneeIds: string[];
  tags: string[];
  sourceNoteId?: string;
  recurrenceRuleId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
