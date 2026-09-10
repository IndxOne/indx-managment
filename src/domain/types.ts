export type WorkspaceKind = "run" | "project";

export type ProfessionalApproach =
  | "simple"
  | "it_ops"
  | "project_amoa"
  | "product_tech"
  | "management"
  | "client_web";

export type CollaborationMode = "solo" | "team";

export type ActionStatus = "todo" | "doing" | "waiting" | "done";

export type Priority = "high" | "normal" | "low";

export type WorkItemType =
  | "task"
  | "request"
  | "incident"
  | "maintenance"
  | "deliverable"
  | "milestone"
  | "decision"
  | "risk";

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

/**
 * Relance après N jours au statut "waiting" (cadrage §10). `enabled` porte
 * l'état marche/arrêt séparément de `afterDays` : désactiver la relance ne
 * doit pas effacer le réglage ni l'historique déjà accumulé.
 */
export interface WaitingReminderRule {
  afterDays: number;
  enabled: boolean;
  /** Horodatages ISO des déclenchements déjà enregistrés, append-only. */
  history: string[];
}

/** Note horodatée, texte seul — pas de pièces jointes ni de multi-utilisateur temps réel. */
export interface ActionNote {
  id: string;
  text: string;
  createdAt: string;
}

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
  /** Instant ISO d'entrée dans le statut "waiting" en cours (absent sinon). */
  waitingSince?: string;
  waitingReminder?: WaitingReminderRule;
  /** Journal append-only, du plus ancien au plus récent (absent tant qu'aucune note). */
  notes?: ActionNote[];
  /** Référence vers une autre action (RUN ou PROJET), lien simple non bidirectionnel. */
  linkedActionId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
