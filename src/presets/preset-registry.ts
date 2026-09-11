import type { ActionStatus, ProfessionalApproach, WorkspaceKind } from "../domain/types";

export interface WorkspacePreset {
  id: ProfessionalApproach;
  /**
   * Natures pour lesquelles cette approche est recommandée (cadrage §5).
   * N'est JAMAIS utilisé pour bloquer une combinaison — seulement pour
   * afficher un avertissement discret. "Aucun blocage artificiel".
   */
  allowedKinds: WorkspaceKind[];
  defaultView: "day" | "week" | "phase" | "status" | "assignee";
  visibleFields: string[];
  quickFilters: string[];
  suggestedAutomations: string[];
  statusLabels?: Partial<Record<ActionStatus, string>>;
  phaseTemplate?: string[];
}

export const PRESET_REGISTRY: Record<ProfessionalApproach, WorkspacePreset> = {
  simple: {
    id: "simple",
    allowedKinds: ["run", "project"],
    defaultView: "week",
    visibleFields: ["title", "status", "dueDate"],
    quickFilters: ["thisWeek", "done"],
    suggestedAutomations: [],
    // Phases de déroulement (où en est le TRAVAIL), pas des statuts déguisés
    // (cadrage Lot 6 §E) — l'ancien template ("à traiter"/"en cours"/"en
    // attente"/"terminé") reproduisait mot pour mot STATUS_LABELS_DEFAULT,
    // confondant phase et statut. Les actions existantes avec un ancien
    // phaseId sont remappées vers l'équivalent le plus proche par
    // LEGACY_PHASE_COLUMNS (ProjectWorkspaceScreen.tsx), jamais perdues.
    phaseTemplate: ["preparation", "realisation", "verification", "cloture"],
  },
  it_ops: {
    id: "it_ops",
    allowedKinds: ["run"],
    defaultView: "day",
    visibleFields: ["title", "category", "priority", "status", "waitingSince", "recurrence"],
    quickFilters: ["today", "waiting", "highPriority"],
    suggestedAutomations: ["reminderAfterWaiting"],
  },
  project_amoa: {
    id: "project_amoa",
    allowedKinds: ["project"],
    defaultView: "phase",
    visibleFields: ["title", "phase", "deliverable", "milestone", "decision", "risk"],
    quickFilters: ["currentPhase", "milestonesOnly"],
    suggestedAutomations: [],
    phaseTemplate: ["cadrage", "conception", "realisation", "deploiement"],
  },
  product_tech: {
    id: "product_tech",
    allowedKinds: ["project"],
    defaultView: "status",
    visibleFields: ["title", "status", "sprint", "backlogRank", "debtFlag", "incidentFlag"],
    quickFilters: ["backlog", "inReview", "technicalDebt"],
    suggestedAutomations: [],
    statusLabels: { todo: "Backlog", doing: "En cours", waiting: "En revue", done: "Livré" },
    phaseTemplate: ["backlog", "developpement", "revue", "livre"],
  },
  management: {
    id: "management",
    allowedKinds: ["run", "project"],
    defaultView: "assignee",
    visibleFields: ["title", "assignee", "status", "workload", "blocker", "dueDate"],
    quickFilters: ["byAssignee", "blocked"],
    suggestedAutomations: ["overloadWarning"],
    phaseTemplate: ["objectifs", "planification", "suivi", "bilan"],
  },
  client_web: {
    id: "client_web",
    allowedKinds: ["project"],
    defaultView: "phase",
    visibleFields: ["title", "phase", "deliverable", "milestone", "decision"],
    quickFilters: ["currentPhase", "milestonesOnly"],
    suggestedAutomations: [],
    phaseTemplate: ["brief", "devis", "maquette", "developpement", "recette", "livraison"],
  },
};

export function isKnownApproach(approach: string): approach is ProfessionalApproach {
  return Object.prototype.hasOwnProperty.call(PRESET_REGISTRY, approach);
}

export function resolveWorkspacePreset(workspace: { approach: ProfessionalApproach }): WorkspacePreset {
  const preset = PRESET_REGISTRY[workspace.approach];
  if (!preset) {
    throw new Error(`Aucun préréglage pour l'approche "${workspace.approach}"`);
  }
  return preset;
}

export function isRecommendedApproach(kind: WorkspaceKind, approach: ProfessionalApproach): boolean {
  return PRESET_REGISTRY[approach].allowedKinds.includes(kind);
}

/**
 * Champs actuellement utilisés qui deviendraient masqués après le
 * changement d'approche — sert à déclencher la confirmation UI
 * (cadrage §4 : "demande confirmation si certains champs deviennent
 * masqués"). Ne modifie jamais les données elles-mêmes.
 */
export function computeHiddenFieldsOnApproachChange(
  currentApproach: ProfessionalApproach,
  nextApproach: ProfessionalApproach,
  fieldsInUse: readonly string[]
): string[] {
  const currentFields = new Set(PRESET_REGISTRY[currentApproach].visibleFields);
  const nextFields = new Set(PRESET_REGISTRY[nextApproach].visibleFields);
  return fieldsInUse.filter((field) => currentFields.has(field) && !nextFields.has(field));
}
