import type { ProjectStatus, ProjectMethod, ObjectiveStatus, Criticality } from "../../domain/v3/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import type { RecentChangeSourceType } from "../../domain/v3/project-overview/types";
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
