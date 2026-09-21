import type { EntityId, IsoDateTime, Milestone, Project } from "../types";
import type { BriefProjection } from "../brief/types";
import { SEVERITY_RANK } from "../brief/prioritize";
import type { RuleSeverity } from "../rules/types";
import { pickNextMilestone } from "../project-overview/build-project-overview";
import type { ProjectsListItem, ProjectsListProjection } from "./types";

export interface BuildProjectsListInput {
  now: IsoDateTime;
  /** Tous les projets accessibles (aucune limite — le reader ne borne pas
   * la liste, contrairement à Home). */
  projects: Project[];
  briefsByProjectId: Map<EntityId, BriefProjection>;
  milestonesByProjectId: Map<EntityId, Milestone[]>;
}

/** Pire sévérité (rang le plus bas = le plus grave, SEVERITY_RANK réutilisé
 * de brief/prioritize.ts — jamais un second classement) parmi les
 * attentionItems déjà produits par buildBrief(). undefined si aucun. */
function worstSeverity(brief: BriefProjection | undefined): RuleSeverity | undefined {
  if (!brief || brief.attentionItems.length === 0) return undefined;
  return brief.attentionItems.reduce<RuleSeverity>(
    (worst, item) => (SEVERITY_RANK[item.severity] < SEVERITY_RANK[worst] ? item.severity : worst),
    brief.attentionItems[0]!.severity
  );
}

/**
 * Composition pure (Lot UX-3, gate validée) : jamais d'accès réseau, jamais
 * une règle métier réévaluée. Même patron que build-home-overview.ts
 * (UX-2) : consomme des BriefProjection déjà calculées par buildBrief() et
 * des Milestone bruts déjà chargés, ne fait que les recomposer par projet.
 */
export function buildProjectsList(input: BuildProjectsListInput): ProjectsListProjection {
  const { now, projects, briefsByProjectId, milestonesByProjectId } = input;

  const items: ProjectsListItem[] = projects.map((project) => {
    const brief = briefsByProjectId.get(project.id);
    const milestones = milestonesByProjectId.get(project.id) ?? [];
    const attentionLevel = worstSeverity(brief);
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      criticality: project.criticality,
      nextMilestone: pickNextMilestone(milestones),
      needsAttention: attentionLevel !== undefined,
      attentionLevel,
      updatedAt: project.updatedAt,
    };
  });

  return { generatedAt: now, projects: items };
}
