import { useMemo } from "react";
import { deriveScheduleKeys, formatRelativeLabel, type RelativeLabelKey } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { EmptyState } from "../components/StateBlocks";

interface AggregatedEntry {
  workspaceName: string;
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
          result.push({ workspaceName: workspace.name, action });
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
          entries.map(({ workspaceName, action }) => {
            const derived = deriveScheduleKeys(action.schedule, timezone);
            const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey;
            return (
              <div className="action-row" key={action.id} data-waiting={action.status === "waiting"}>
                <div>
                  <span className="action-title">{action.title}</span>
                  <div className="action-sub">
                    {workspaceName} · {STATUS_LABELS_DEFAULT[action.status]}
                    {scheduleLabel ? ` · ${scheduleLabel}` : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
