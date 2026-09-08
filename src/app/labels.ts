import type { ActionStatus, Priority, ProfessionalApproach, WorkItemType, WorkspaceKind } from "../domain/types";

export const APPROACH_LABELS: Record<ProfessionalApproach, string> = {
  simple: "Simple",
  it_ops: "IT Ops",
  project_amoa: "Projet / AMOA",
  product_tech: "Produit / Tech",
  management: "Management",
};

export const APPROACH_DESCRIPTIONS: Record<ProfessionalApproach, string> = {
  simple: "Titre, statut, échéance — pour non-techniciens.",
  it_ops: "Catégorie, priorité, attente, récurrence — support et exploitation.",
  project_amoa: "Livrable, jalon, décision, risque — CDP, AMOA, PMO.",
  product_tech: "Backlog, revue, dette, incident — dev et tech lead.",
  management: "Charge, blocage, échéance — pilotage d'équipe.",
};

export const KIND_LABELS: Record<WorkspaceKind, string> = {
  run: "RUN",
  project: "PROJET",
};

export const STATUS_LABELS_DEFAULT: Record<ActionStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  waiting: "En attente",
  done: "Terminé",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Haute",
  normal: "Normale",
  low: "Basse",
};

export const ITEM_TYPE_OPTIONS: WorkItemType[] = [
  "task",
  "request",
  "incident",
  "maintenance",
  "deliverable",
  "milestone",
  "decision",
  "risk",
];

export const ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  task: "Tâche",
  request: "Demande",
  incident: "Incident",
  maintenance: "Maintenance",
  deliverable: "Livrable",
  milestone: "Jalon",
  decision: "Décision",
  risk: "Risque",
};

// Slugs des phaseTemplate déclarés dans preset-registry.ts : accents corrigés
// pour l'affichage, capitalisation générique en repli pour un slug inconnu.
const PHASE_LABEL_OVERRIDES: Record<string, string> = {
  cadrage: "Cadrage",
  ateliers: "Ateliers",
  realisations: "Réalisations",
  validations: "Validations",
  restitutions: "Restitutions",
  cloture: "Clôture",
};

export function phaseLabel(phase: string): string {
  return PHASE_LABEL_OVERRIDES[phase] ?? phase.charAt(0).toUpperCase() + phase.slice(1);
}
