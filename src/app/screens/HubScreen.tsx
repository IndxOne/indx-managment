import { useMemo, useState, type FormEvent } from "react";
import type { ActionStatus } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import type { HubSettings } from "../adapters/store-context";
import { MoreSubNav } from "../components/MoreSubNav";
import type { MoreDestination } from "../more-links";

/**
 * Vue d'ensemble transversale, tous espaces confondus : des compteurs
 * dérivés de l'état déjà chargé, plus des repères business déclaratifs
 * (objectif mensuel, TJM, trésorerie) saisis à la main — jamais calculés,
 * cf. HubSettings dans store-context.ts.
 */
export function HubScreen({
  onNavigate,
  onOpenSpaces,
  onOpenStatus,
}: {
  onNavigate: (destination: MoreDestination) => void;
  onOpenSpaces: () => void;
  onOpenStatus: (status: ActionStatus) => void;
}) {
  const { state, updateHubSettings } = useStore();

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
      <MoreSubNav active="hub" onNavigate={onNavigate} />
      <div className="app-main">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Espaces
        </h2>
        <div className="stat-grid">
          <StatTile value={stats.runCount} label="Espaces RUN" color="var(--color-warning)" onClick={onOpenSpaces} />
          <StatTile value={stats.projectCount} label="Espaces PROJET" color="#6355ff" onClick={onOpenSpaces} />
        </div>

        <h2 className="section-title">Actions ({stats.totalActions})</h2>
        <div className="stat-grid">
          {(Object.keys(STATUS_LABELS_DEFAULT) as ActionStatus[]).map((status) => (
            <StatTile
              key={status}
              value={stats.byStatus[status]}
              label={STATUS_LABELS_DEFAULT[status]}
              color={STATUS_COLORS[status]}
              onClick={() => onOpenStatus(status)}
            />
          ))}
        </div>

        <h2 className="section-title">Suivi</h2>
        <div className="stat-grid">
          <StatTile
            value={stats.activeReminders}
            label="Relances actives"
            sub={stats.dueReminders > 0 ? `dont ${stats.dueReminders} due(s)` : undefined}
            color="var(--color-warning)"
            onClick={() => onNavigate("reminders")}
          />
          <StatTile value={stats.activeRecurrenceRules} label="Récurrences actives" color="#8b5cf6" />
        </div>

        <h2 className="section-title">Objectifs</h2>
        <p className="action-sub" style={{ marginBottom: "var(--space-3)" }}>
          Repères saisis à la main, non reliés aux actions ci-dessus.
        </p>
        <HubObjectivesForm settings={state.hubSettings} onSave={updateHubSettings} />
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<ActionStatus, string> = {
  todo: "var(--color-text-tertiary)",
  doing: "var(--color-accent)",
  waiting: "var(--color-warning)",
  done: "var(--color-success)",
};

function StatTile({
  value,
  label,
  sub,
  color,
  onClick,
}: {
  value: number;
  label: string;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="stat-tile-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-tile-label">
        {label}
        {sub && ` · ${sub}`}
      </div>
    </>
  );
  if (!onClick) {
    return <div className="stat-tile">{content}</div>;
  }
  return (
    <button type="button" className="stat-tile stat-tile-button" onClick={onClick}>
      {content}
    </button>
  );
}

function toInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function toSettingValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function HubObjectivesForm({
  settings,
  onSave,
}: {
  settings: HubSettings | undefined;
  onSave: (settings: HubSettings) => Promise<void>;
}) {
  const [monthlyObjective, setMonthlyObjective] = useState(toInputValue(settings?.monthlyObjective ?? null));
  const [dailyRate, setDailyRate] = useState(toInputValue(settings?.dailyRate ?? null));
  const [treasuryForecast, setTreasuryForecast] = useState(toInputValue(settings?.treasuryForecast ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave({
        monthlyObjective: toSettingValue(monthlyObjective),
        dailyRate: toSettingValue(dailyRate),
        treasuryForecast: toSettingValue(treasuryForecast),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="hub-monthly-objective">Objectif mensuel (€)</label>
        <input
          id="hub-monthly-objective"
          type="number"
          inputMode="decimal"
          min={0}
          value={monthlyObjective}
          onChange={(event) => setMonthlyObjective(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="hub-daily-rate">TJM de référence (€)</label>
        <input
          id="hub-daily-rate"
          type="number"
          inputMode="decimal"
          min={0}
          value={dailyRate}
          onChange={(event) => setDailyRate(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="hub-treasury-forecast">Trésorerie prévue (€)</label>
        <input
          id="hub-treasury-forecast"
          type="number"
          inputMode="decimal"
          value={treasuryForecast}
          onChange={(event) => setTreasuryForecast(event.target.value)}
        />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block tap-target" disabled={saving}>
        {saved ? "Enregistré !" : "Enregistrer"}
      </button>
    </form>
  );
}
