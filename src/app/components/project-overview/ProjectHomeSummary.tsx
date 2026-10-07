import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";

function formatTargetDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ProjectHomeSummary({ overview }: { overview: ProjectOverviewProjection }) {
  const { summary } = overview;
  const attentionCount = summary.openIssuesCount + summary.highCriticalRisksCount;

  return (
    <section className="project-home-summary" aria-label="État du projet">
      <div className="project-home-summary-main">
        <span className="project-home-summary-label">Actions ouvertes</span>
        <strong className="project-home-summary-value">{summary.openWorkItemsCount}</strong>
      </div>

      <div className="project-home-summary-grid">
        <div className="project-home-summary-metric">
          <span className="project-home-summary-metric-value">{attentionCount}</span>
          <span className="project-home-summary-metric-label">à surveiller</span>
        </div>
        <div className="project-home-summary-metric">
          <span className="project-home-summary-metric-value">{summary.pendingDecisionsCount}</span>
          <span className="project-home-summary-metric-label">décisions</span>
        </div>
      </div>

      {summary.nextMilestone && (
        <div className="project-home-summary-next">
          <span>Prochain jalon</span>
          <strong>{summary.nextMilestone.observableResult}</strong>
          <span>{formatTargetDate(summary.nextMilestone.targetDate)}</span>
        </div>
      )}
    </section>
  );
}
