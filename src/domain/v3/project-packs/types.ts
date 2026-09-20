/**
 * Packs projet (Lot 5, gate validée) — cadre de démarrage métier, jamais
 * une nouvelle source de vérité après application (cahier §2) : ces types
 * ne décrivent que ce qu'un pack PROPOSE, jamais des entités V3 réelles.
 * Aucun Risk/Issue/Decision/ChangeRequest/Evidence templatisé ici — ces
 * entités n'ont de sens qu'après un fait réel (§4 de la gate).
 */

import type { ProjectMethod } from "../types";

export interface ProjectPackStage {
  name: string;
  order: number;
}

export interface ProjectPackObjective {
  statement: string;
  expectedValue?: string;
}

/**
 * targetOffsetDays : décalage en jours (entier, >= 0) depuis `now`
 * (date d'application) — jamais une date littérale, un pack est versionné,
 * pas daté. Ajout déterministe de offset × 24h en UTC, sans dépendance à
 * une timezone (§4 du correctif de gate).
 */
export interface ProjectPackMilestone {
  observableResult: string;
  targetOffsetDays: number;
  /** Index dans pack.stages ; résolu en Stage.id réel à l'application.
   * Absent pour un pack sans stage (ex. run-improvement@1). */
  stageIndex?: number;
}

export interface ProjectPack {
  id: string;
  version: number;
  name: string;
  description: string;
  recommendedFor: string;
  /** Informatif uniquement — jamais imposé au Project (§7 du correctif). */
  method: ProjectMethod;
  stages: ProjectPackStage[];
  objectives: ProjectPackObjective[];
  milestones: ProjectPackMilestone[];
}

/** Clé stable "id@version" — utilisée pour l'événement produit et la
 * dérivation déterministe des IDs (§1 du correctif de gate). */
export function packKey(pack: Pick<ProjectPack, "id" | "version">): string {
  return `${pack.id}@${pack.version}`;
}
