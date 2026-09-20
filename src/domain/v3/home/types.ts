import type { Criticality, EntityId, IsoDateTime, ProjectStatus } from "../types";
import type { ProjectOverviewSummary } from "../project-overview/types";
import type { BriefItem } from "../brief/types";

/**
 * Home V3 (Lot UX-2, gate validée) — projection de composition pure :
 * agrège des BriefProjection déjà calculées par buildBrief() (aucune règle
 * réévaluée ici, aucun nouveau score) avec la liste courte de projets
 * affichée. Jamais de compteur global partiel présenté comme exhaustif
 * (décision de gate §1/§3) : pas de champ "count" sur cette projection.
 */
export interface HomeProjectCard {
  id: EntityId;
  name: string;
  status: ProjectStatus;
  criticality: Criticality;
  /** Réutilise exactement pickNextMilestone() de project-overview — même
   * définition, jamais une seconde règle "prochain jalon". */
  nextMilestone?: ProjectOverviewSummary["nextMilestone"];
  /** = au moins un attentionItems pour ce projet dans son BriefProjection. */
  needsAttention: boolean;
}

export interface HomeOverviewProjection {
  generatedAt: IsoDateTime;
  /** Fusion des attentionItems (déjà priorisés par buildBrief) des projets
   * chargés, re-triée par prioritizeBriefItems (même fonction, pas une
   * nouvelle) puis tronquée au top 3 — jamais un recalcul de sévérité. */
  attentionItems: BriefItem[];
  /** ≤5 projets V3 non clôturés, triés updated_at desc — jamais un
   * Workspace V2 (type distinct, structurellement impossible ici). */
  projects: HomeProjectCard[];
}
