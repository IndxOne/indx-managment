import { useMemo } from "react";
import { deriveScheduleKeys, formatRelativeLabel, type RelativeLabelKey } from "../../calendar/calendar-engine";
import type { Action, WorkspaceKind } from "../../domain/types";
import { KIND_LABELS, STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { EmptyState } from "../components/StateBlocks";
import { StatusCheckIcon } from "../components/Icons";

interface AggregatedEntry {
  workspaceName: string;
  workspaceKind: WorkspaceKind;
  action: Action;
}

/**
 * Vue transversale légère (Aujourd'hui / Semaine) : agrège RUN et PROJET
 * pour la navigation basse du cadrage §8. Le filtrage/tri complet
 * multi-espaces reste du ressort du Lot 5 (transversal) ; ceci couvre le
 * strict nécessaire pour que les deux entrées de navigation soient
 * fonctionnelles dès le Lot 2. Lecture seule ici : le déplacement se fait
 * depuis l'écran de l'espace concerné.
 */
export function AggregatedActionsScreen({
  title,
  includeLabels,
  emptyDescription,
}: {
  title: string;
  includeLabels: RelativeLabelKey[];
  emptyDescription: string;
}) {
  const { state } = useStore();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const entries = useMemo<AggregatedEntry[]>(() => {
    const result: AggregatedEntry[] = [];
    for (const workspace of state.workspaces) {
      const actions = state.actionsByWorkspace[workspace.id] ?? [];
      for (const action of actions) {
        const derived = deriveScheduleKeys(action.schedule, timezone);
        if (action.status === "waiting" || includeLabels.includes(derived.relativeLabel)) {
          result.push({ workspaceName: workspace.name, workspaceKind: workspace.kind, action });
        }
      }
    }
    return result;
  }, [state, timezone, includeLabels]);

  return (
    <div>
      <div className="top-bar">
        <h1>{title}</h1>
      </div>
      <div className="app-main">
        {entries.length === 0 ? (
          <EmptyState title="Rien à afficher" description={emptyDescription} />
        ) : (
          <div className="action-card-list">
            {entries.map(({ workspaceName, workspaceKind, action }) => {
              const derived = deriveScheduleKeys(action.schedule, timezone);
              const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey;
              return (
                <div className="action-card" key={action.id}>
                  <div className="action-card-chips">
                    <span className={`badge badge-${workspaceKind}`}>{KIND_LABELS[workspaceKind]}</span>
                  </div>
                  <div className="action-card-body">
                    <StatusCheckIcon status={action.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="action-title">{action.title}</span>
                      <div className="action-sub">
                        {workspaceName} · {STATUS_LABELS_DEFAULT[action.status]}
                        {scheduleLabel ? ` · ${scheduleLabel}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
