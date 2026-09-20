import type { ProjectOverviewSummary } from "../../../domain/v3/project-overview/types";

/** 5 compteurs déjà calculés par le domaine (§7 de la gate : pas de score de
 * santé, pas de %) + le prochain jalon en case dédiée — aucun recalcul ici. */
const COUNT_ROWS: { key: keyof ProjectOverviewSummary; label: string }[] = [
  { key: "activeObjectivesCount", label: "Objectifs actifs" },
  { key: "openWorkItemsCount", label: "WorkItems ouverts" },
  { key: "highCriticalRisksCount", label: "Risques haute/critique" },
  { key: "pendingDecisionsCount", label: "Décisions en attente" },
  { key: "openIssuesCount", label: "Issues ouvertes" },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ProjectSummaryGrid({ summary }: { summary: ProjectOverviewSummary }) {
  return (
    <div className="brief-summary" role="group" aria-label="Résumé du projet">
      {COUNT_ROWS.map(({ key, label }) => (
        <div key={key} className="brief-summary-item">
          <span className="brief-summary-count">{summary[key] as number}</span>
          <span className="brief-summary-label">{label}</span>
        </div>
      ))}
      <div className="brief-summary-item">
        <span className="brief-summary-count">{summary.nextMilestone ? formatDate(summary.nextMilestone.targetDate) : "—"}</span>
        <span className="brief-summary-label">Prochain jalon</span>
      </div>
    </div>
  );
}
