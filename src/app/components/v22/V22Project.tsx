import type { ReactNode } from "react";
import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";
import { CRITICALITY_LABELS, PROJECT_METHOD_LABELS, PROJECT_STATUS_LABELS } from "../../utils/project-overview-labels";
import { criticalityToTone, projectStatusToTone } from "../../utils/tone";
import { BriefItemCard } from "../brief/BriefItemCard";
import { SeverityBadge } from "../SeverityBadge";
import { DECISION_STATUS_LABELS, MILESTONE_STATUS_LABELS, formatDay, label } from "./labels";

/** Projet V2.2 — en-tête, « Ce qui compte maintenant », parcours (jalons), à surveiller, décisions.
 * Dérivé de ProjectOverviewProjection uniquement. `detail` = anciens Explorer / récents / contexte,
 * conservés dans une disclosure (masquage réversible, aucune capacité supprimée). */
export function V22Project({
  overview,
  focused,
  onOpenBrief,
  onOpenAction,
  detail,
  detailOpen,
}: {
  overview: ProjectOverviewProjection;
  focused?: boolean;
  onOpenBrief: () => void;
  onOpenAction: (workItemId: string) => void;
  detail?: ReactNode;
  detailOpen?: boolean;
}) {
  const { project, focusItem, watchItems, milestones, decisions, summary } = overview;
  const focusWorkItem =
    focusItem?.sourceType === "work_item" ? overview.workItems.find((w) => w.id === focusItem.sourceId) : undefined;
  const orderedMilestones = [...milestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <div className="v22-project-view">
      <header className="v22-hero">
        <p className="v22-eyebrow">Projet · {PROJECT_METHOD_LABELS[project.method]}</p>
        <h1 className="v22-h1">{project.name}</h1>
        <div className="v22-badges">
          <SeverityBadge tone={projectStatusToTone(project.status)} label={PROJECT_STATUS_LABELS[project.status]} />
          <SeverityBadge tone={criticalityToTone(project.criticality)} label={CRITICALITY_LABELS[project.criticality]} />
        </div>
        {focusWorkItem && (
          <button type="button" className="v22-btn tap-target" onClick={() => onOpenAction(focusWorkItem.id)}>
            Prochaine action →
          </button>
        )}
      </header>

      <section aria-labelledby="v22-now" className="v22-section">
        <h2 id="v22-now" className="v22-h2">Ce qui compte maintenant</h2>
        {focusItem ? (
          <div className="v22-focus">
            <BriefItemCard item={focusItem} focused={!!focused} />
            <div className="v22-actions">
              {focusWorkItem && (
                <button type="button" className="v22-btn v22-btn-primary tap-target" onClick={() => onOpenAction(focusWorkItem.id)}>
                  Ouvrir l&apos;action
                </button>
              )}
              <button type="button" className="v22-btn tap-target" onClick={onOpenBrief}>
                Voir dans Mon Brief
              </button>
            </div>
          </div>
        ) : (
          <p className="v22-empty">Rien de critique à traiter maintenant.</p>
        )}
      </section>

      <section aria-labelledby="v22-path" className="v22-section">
        <h2 id="v22-path" className="v22-h2">Parcours du projet</h2>
        {orderedMilestones.length === 0 ? (
          <p className="v22-empty">Aucun jalon planifié.</p>
        ) : (
          <ol className="v22-steps">
            {orderedMilestones.map((m, i) => (
              <li key={m.id} className="v22-step" data-done={m.status === "accepted" || undefined} data-next={summary.nextMilestone?.id === m.id || undefined}>
                <span className="v22-dot" aria-hidden="true" />
                <div>
                  <span className="v22-step-n">Étape {i + 1}/{orderedMilestones.length}</span>
                  <strong>{m.observableResult}</strong>
                  <span className="v22-step-sub">
                    {label(MILESTONE_STATUS_LABELS, m.status)} · {formatDay(m.targetDate)}
                    {summary.nextMilestone?.id === m.id ? " · prochain jalon" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {watchItems.length > 0 && (
        <section aria-labelledby="v22-watch" className="v22-section">
          <h2 id="v22-watch" className="v22-h2">À surveiller</h2>
          <div className="v22-stack">
            {watchItems.map((item) => (
              <BriefItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {decisions.length > 0 && (
        <section aria-labelledby="v22-decisions" className="v22-section">
          <h2 id="v22-decisions" className="v22-h2">Décisions</h2>
          <ul className="v22-list">
            {decisions.slice(0, 3).map((d) => (
              <li key={d.id} className="v22-card">
                <strong>{d.question}</strong>
                <span className="v22-step-sub">
                  {label(DECISION_STATUS_LABELS, d.status)}
                  {d.dueDate ? ` · échéance ${formatDay(d.dueDate)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail && (
        <details className="v22-detail" open={detailOpen}>
          <summary className="tap-target">Tout le détail du projet</summary>
          {detail}
        </details>
      )}
    </div>
  );
}
