import type { EntityId, IsoDateTime, Milestone, Project } from "../types";
import type { BriefProjection } from "../brief/types";
import { prioritizeBriefItems } from "../brief/prioritize";
import { pickNextMilestone } from "../project-overview/build-project-overview";
import type { HomeOverviewProjection, HomeProjectCard } from "./types";

const MAX_ATTENTION_ITEMS = 3;

export interface BuildHomeOverviewInput {
  now: IsoDateTime;
  /** Déjà filtrés/triés/bornés par le reader (statut non clôturé, updated_at
   * desc, limite 5) — cette fonction ne refait aucun de ces choix, elle
   * compose uniquement ce qu'on lui donne. */
  projects: Project[];
  /** Une BriefProjection déjà calculée par buildBrief() par projet — jamais
   * recalculée ici. */
  briefsByProjectId: Map<EntityId, BriefProjection>;
  /** Milestones bruts (toutes, pas seulement celles en attention) par
   * projet — nécessaires à pickNextMilestone(), absents de BriefProjection
   * (qui ne garde que les jalons nécessitant attention). */
  milestonesByProjectId: Map<EntityId, Milestone[]>;
}

/**
 * Composition pure (Lot UX-2, gate validée) : jamais d'accès réseau, jamais
 * une règle métier réévaluée. Fusionne les attentionItems déjà produits par
 * buildBrief() pour chaque projet chargé, les re-priorise avec la même
 * fonction que Mon Brief (prioritizeBriefItems — pas une nouvelle
 * comparaison), et compose les cartes projet à partir de pickNextMilestone()
 * (réutilisé tel quel depuis project-overview).
 */
export function buildHomeOverview(input: BuildHomeOverviewInput): HomeOverviewProjection {
  const { now, projects, briefsByProjectId, milestonesByProjectId } = input;

  const allAttentionItems = projects.flatMap((project) => briefsByProjectId.get(project.id)?.attentionItems ?? []);
  const attentionItems = prioritizeBriefItems(allAttentionItems, now).slice(0, MAX_ATTENTION_ITEMS);

  const projectCards: HomeProjectCard[] = projects.map((project) => {
    const brief = briefsByProjectId.get(project.id);
    const milestones = milestonesByProjectId.get(project.id) ?? [];
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      criticality: project.criticality,
      nextMilestone: pickNextMilestone(milestones),
      needsAttention: (brief?.attentionItems.length ?? 0) > 0,
    };
  });

  return { generatedAt: now, attentionItems, projects: projectCards };
}
