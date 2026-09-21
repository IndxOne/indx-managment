import type { ProjectStatus, ProjectMethod, ObjectiveStatus, Criticality } from "../../domain/v3/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import type { ProjectOverviewProjection, RecentChangeSourceType } from "../../domain/v3/project-overview/types";
import { SOURCE_TYPE_LABELS } from "./brief-labels";

/** Libellés d'affichage — présentation pure, aucune logique métier. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  on_track: "Dans les temps",
  at_risk: "À risque",
  off_track: "Hors trajectoire",
  closed: "Clôturé",
};

export const PROJECT_METHOD_LABELS: Record<ProjectMethod, string> = {
  predictive: "Prédictif",
  agile: "Agile",
  hybrid: "Hybride",
  run: "RUN",
};

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  active: "Actif",
  achieved: "Atteint",
  abandoned: "Abandonné",
};

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

/** UX-5.3 ("Changé récemment") : réutilise SOURCE_TYPE_LABELS (Mon Brief),
 * complété par "objective" (jamais couvert par Mon Brief). */
export const RECENT_CHANGE_TYPE_LABELS: Record<RecentChangeSourceType, string> = {
  ...SOURCE_TYPE_LABELS,
  objective: "Objectif",
};

function formatContextDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export interface ProjectContextRow {
  label: string;
  value: string;
  /** UX-5.4 (rail contextuel desktop) : statut/criticité sont déjà visibles
   * dans le header (`.project-pilot-status-row`) — le bloc compact mobile
   * ne les duplique pas, seul le rail desktop (à côté, pas dans le flux
   * principal) les affiche. */
  hideInCompact?: boolean;
}

/**
 * UX-5.4 (rail contextuel) — lignes de métadonnées stables du projet,
 * réutilisant exclusivement `overview.project` (aucune nouvelle donnée,
 * aucune nouvelle requête). Une valeur absente et significative (sponsor,
 * chef de projet) affiche un fallback compact ("Non renseigné") ; une date
 * absente masque simplement sa ligne plutôt que d'afficher un tiret.
 */
export function buildProjectContextRows(project: ProjectOverviewProjection["project"]): ProjectContextRow[] {
  const rows: ProjectContextRow[] = [
    { label: "Chef de projet", value: project.projectManager ?? "Non renseigné" },
    { label: "Sponsor", value: project.sponsor ?? "Non renseigné" },
    { label: "Méthode", value: PROJECT_METHOD_LABELS[project.method] },
  ];
  if (project.targetDate) rows.push({ label: "Date cible", value: formatContextDate(project.targetDate) });
  if (project.forecastDate) rows.push({ label: "Prévision", value: formatContextDate(project.forecastDate) });
  rows.push({ label: "Statut", value: PROJECT_STATUS_LABELS[project.status], hideInCompact: true });
  rows.push({ label: "Criticité", value: CRITICALITY_LABELS[project.criticality], hideInCompact: true });
  return rows;
}

/**
 * Traduit une erreur d'infrastructure en message utilisateur déterministe —
 * jamais PersistenceError.message affiché tel quel (même contrat que
 * brief-labels.ts).
 */
export function projectOverviewErrorToUserMessage(error: PersistenceError): string {
  if (error.kind === "persistence" && error.code === "not_found") {
    return "Projet indisponible ou inaccessible.";
  }
  return "Impossible de charger ce projet.";
}
