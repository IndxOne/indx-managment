import { useMemo } from "react";
import type { ActionStatus } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";

/**
 * Vue d'ensemble transversale, tous espaces confondus : uniquement des
 * compteurs dérivés de l'état déjà chargé (pas de nouvelle donnée, pas de
 * liste — Aujourd'hui/Semaine couvrent déjà les listes d'actions).
 */
export function HubScreen() {
  const { state } = useStore();

  const stats = useMemo(() => {
    const byStatus: Record<ActionStatus, number> = { todo: 0, doing: 0, waiting: 0, done: 0 };
    let totalActions = 0;
    let activeReminders = 0;
    let dueReminders = 0;
    for (const actions of Object.values(state.actionsByWorkspace)) {
      for (const action of actions) {
        totalActions += 1;
        byStatus[action.status] += 1;
        if (action.status === "waiting" && action.waitingReminder?.enabled) {
          activeReminders += 1;
          if (isWaitingReminderDue(action)) dueReminders += 1;
        }
      }
    }
    const runCount = state.workspaces.filter((w) => w.kind === "run").length;
    const projectCount = state.workspaces.filter((w) => w.kind === "project").length;
    const activeRecurrenceRules = Object.values(state.recurrenceRulesByWorkspace).reduce(
      (sum, rules) => sum + rules.length,
      0
    );
    return { byStatus, totalActions, activeReminders, dueReminders, runCount, projectCount, activeRecurrenceRules };
  }, [state]);

  return (
    <div>
      <div className="top-bar">
        <h1>Hub</h1>
      </div>
      <div className="app-main">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Espaces
        </h2>
        <div className="stat-grid">
          <StatTile value={stats.runCount} label="Espaces RUN" />
          <StatTile value={stats.projectCount} label="Espaces PROJET" />
        </div>

        <h2 className="section-title">Actions ({stats.totalActions})</h2>
        <div className="stat-grid">
          {(Object.keys(STATUS_LABELS_DEFAULT) as ActionStatus[]).map((status) => (
            <StatTile key={status} value={stats.byStatus[status]} label={STATUS_LABELS_DEFAULT[status]} />
          ))}
        </div>

        <h2 className="section-title">Suivi</h2>
        <div className="stat-grid">
          <StatTile value={stats.activeReminders} label="Relances actives" sub={stats.dueReminders > 0 ? `dont ${stats.dueReminders} due(s)` : undefined} />
          <StatTile value={stats.activeRecurrenceRules} label="Récurrences actives" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">
        {label}
        {sub && ` · ${sub}`}
      </div>
    </div>
  );
}
