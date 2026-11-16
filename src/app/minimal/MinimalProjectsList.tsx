import { PROJECT_STATUS_LABELS } from "../utils/project-overview-labels";
import { projectStatusToTone } from "../utils/tone";
import { SeverityBadge } from "../components/SeverityBadge";
import type { MinimalProjectCard } from "./build-minimal-projects";

function day(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** « Mes projets » : nom, statut, objectif, prochaine action, échéance · responsable. Présentation pure. */
export function MinimalProjectsList({ projects, onOpen }: { projects: MinimalProjectCard[]; onOpen: (projectId: string) => void }) {
  return (
    <ul className="mini-cards">
      {projects.map((p) => (
        <li key={p.id}>
          <button type="button" className="mini-card-btn tap-target" onClick={() => onOpen(p.id)}>
            <span className="mini-card-top">
              <strong className="mini-card-name">{p.name}</strong>
              <SeverityBadge tone={projectStatusToTone(p.status)} label={PROJECT_STATUS_LABELS[p.status]} />
            </span>
            <span className="mini-card-obj">{p.objective ?? "Aucun objectif renseigné."}</span>
            <span className="mini-card-next">
              <span className="mini-circle" aria-hidden="true" />
              {p.nextAction ? (
                <span>
                  <strong>Prochaine action :</strong> {p.nextAction.title}
                </span>
              ) : (
                <span>Aucune action en attente</span>
              )}
            </span>
            <span className="mini-card-foot">
              {p.targetDate ? `Échéance : ${day(p.targetDate)}` : "Sans échéance"}
              {p.projectManager ? ` · ${p.projectManager}` : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
