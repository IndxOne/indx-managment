import type { Criticality, EntityId, IsoDateTime, ProjectStatus } from "../types";
import type { ProjectOverviewSummary } from "../project-overview/types";
import type { RuleSeverity } from "../rules/types";

/**
 * Item de la liste Projets V3 (Lot UX-3, gate validée). Volontairement une
 * forme superset de HomeProjectCard (domaine Home, UX-2) — mêmes champs
 * id/name/status/criticality/nextMilestone/needsAttention, plus
 * attentionLevel/updatedAt propres à cet écran. HomeProjectCard (composant
 * React) accepte cette forme telle quelle (typage structurel) : pas de
 * module de type partagé "carte projet" créé uniquement pour l'UI
 * (correction de gate explicite — ne pas dupliquer, ne pas sur-abstraire).
 */
export interface ProjectsListItem {
  id: EntityId;
  name: string;
  status: ProjectStatus;
  criticality: Criticality;
  nextMilestone?: ProjectOverviewSummary["nextMilestone"];
  needsAttention: boolean;
  /** Pire sévérité (RuleSeverity réutilisé, cf. SEVERITY_RANK de
   * brief/prioritize.ts — jamais un second classement) parmi les
   * attentionItems du Brief de ce projet ; undefined si needsAttention est
   * false. */
  attentionLevel?: RuleSeverity;
  updatedAt: IsoDateTime;
}

export interface ProjectsListProjection {
  generatedAt: IsoDateTime;
  projects: ProjectsListItem[];
}
