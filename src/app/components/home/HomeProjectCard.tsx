import type { HomeProjectCard as HomeProjectCardData } from "../../../domain/v3/home/types";
import { CRITICALITY_LABELS, PROJECT_STATUS_LABELS } from "../../utils/project-overview-labels";
import { criticalityToTone, projectStatusToTone } from "../../utils/tone";
import { SeverityBadge } from "../SeverityBadge";
import { IconChevronRight } from "../Icons";

function formatMilestoneDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Carte projet du Bloc 2 de Home V3 (Lot UX-2, gate validée) — toujours un
 * Project V3 (`HomeProjectCard` du domaine), jamais un Workspace V2 : le
 * type d'entrée l'exclut structurellement, pas un filtre à maintenir ici.
 */
export function HomeProjectCard({ project, onOpen }: { project: HomeProjectCardData; onOpen: (projectId: string) => void }) {
  return (
    <button type="button" className="action-card tap-target home-project-card" onClick={() => onOpen(project.id)}>
      <div className="action-card-body">
        <div className="brief-item-card-header">
          <span className="card-title" style={{ flex: 1 }}>
            {project.name}
          </span>
          {project.needsAttention && <SeverityBadge tone="attention" label="Attention" />}
        </div>
        <div className="brief-item-card-header">
          <SeverityBadge tone={projectStatusToTone(project.status)} label={PROJECT_STATUS_LABELS[project.status]} />
          <SeverityBadge tone={criticalityToTone(project.criticality)} label={CRITICALITY_LABELS[project.criticality]} />
        </div>
        <p className="brief-item-card-meta">
          {project.nextMilestone
            ? `Prochain jalon : ${formatMilestoneDate(project.nextMilestone.targetDate)} · ${project.nextMilestone.observableResult}`
            : "Aucun jalon planifié"}
        </p>
      </div>
      <IconChevronRight className="chevron" width={18} height={18} />
    </button>
  );
}
