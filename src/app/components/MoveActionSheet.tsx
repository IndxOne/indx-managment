import { useState } from "react";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { formatIsoWeek } from "../../calendar/iso-week";
import type { Action, ActionStatus } from "../../domain/types";
import type { MoveAxis, MoveDestination } from "../../domain/move-action";
import { phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { scheduleSummary } from "../utils/schedule-summary";
import { BottomSheet } from "./BottomSheet";
import { IconCalendar, IconLayers, StatusCheckIcon } from "./Icons";

export function MoveActionSheet({
  action,
  phaseOptions,
  statusLabels,
  timezone,
  /** Ouvre directement sur cet axe, en sautant l'écran de choix — utilisé par ActionDetailSheet (Lot 5) pour un accès direct depuis les lignes "Statut"/"Échéance". Absent = comportement inchangé (choix de l'axe d'abord). */
  initialAxis,
  onCancel,
  onConfirm,
  onSetReminder,
}: {
  action: Action;
  phaseOptions: string[];
  statusLabels: Record<ActionStatus, string>;
  /** Fuseau de l'écran appelant : la semaine par défaut doit correspondre à "aujourd'hui" pour l'utilisateur, pas en UTC. */
  timezone: string;
  initialAxis?: MoveAxis;
  onCancel: () => void;
  onConfirm: (destination: MoveDestination) => void;
  /** Appelé en plus de onConfirm si l'utilisateur active une relance en passant à "waiting". */
  onSetReminder?: (afterDays: number) => void;
}) {
  const [axis, setAxis] = useState<MoveAxis | null>(initialAxis ?? null);
  const currentWeek = formatIsoWeek(todayInTimeZone(timezone));

  if (axis === null) {
    return (
      <BottomSheet title="Déplacer - choisir l'axe" onClose={onCancel}>
        <p id="move-axis-heading" style={{ fontWeight: 600 }}>
          Déplacer « {action.title} »
        </p>
        <div className="choice-group" role="group" aria-labelledby="move-axis-heading" style={{ marginBottom: 8 }}>
          <button type="button" className="move-axis-row" onClick={() => setAxis("schedule")}>
            <span className="move-axis-icon" aria-hidden="true">
              <IconCalendar width={18} height={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="move-axis-label">Planification</span>
              <span className="move-axis-sub">{scheduleSummary(action.schedule)}</span>
            </span>
          </button>
          {phaseOptions.length > 0 && (
            <button type="button" className="move-axis-row" onClick={() => setAxis("phase")}>
              <span className="move-axis-icon" aria-hidden="true">
                <IconLayers width={18} height={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="move-axis-label">Phase</span>
                <span className="move-axis-sub">{action.phaseId ? phaseLabel(action.phaseId) : "Aucune phase"}</span>
              </span>
            </button>
          )}
          <button type="button" className="move-axis-row" onClick={() => setAxis("status")}>
            <span className="move-axis-icon" aria-hidden="true">
              <StatusCheckIcon status={action.status} size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="move-axis-label">Statut</span>
              <span className="move-axis-sub">{statusLabels[action.status]}</span>
            </span>
          </button>
        </div>
        <div className="choice-group">
          <button type="button" className="action-menu-item" style={{ justifyContent: "center", fontWeight: 600 }} onClick={onCancel}>
            Annuler
          </button>
        </div>
      </BottomSheet>
    );
  }

  if (axis === "schedule") {
    return (
      <ScheduleDestinationStep
        action={action}
        currentWeek={currentWeek}
        onBack={() => setAxis(null)}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  if (axis === "phase") {
    return (
      <BottomSheet title="Déplacer - choisir la phase" onClose={onCancel}>
        <p style={{ fontWeight: 600 }}>Nouvelle phase</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {phaseOptions.map((phase) => (
            <button
              key={phase}
              type="button"
              className={`phase-select-btn ${phaseChipClass(phase)}`}
              onClick={() => onConfirm({ axis: "phase", phaseId: phase })}
            >
              {phaseLabel(phase)}
            </button>
          ))}
        </div>
        <div className="choice-group">
          <button
            type="button"
            className="action-menu-item"
            style={{ justifyContent: "center", fontWeight: 600 }}
            onClick={() => setAxis(null)}
          >
            Retour
          </button>
        </div>
      </BottomSheet>
    );
  }

  // axis === "status"
  return (
    <StatusDestinationStep
      action={action}
      statusLabels={statusLabels}
      onBack={() => setAxis(null)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onSetReminder={onSetReminder}
    />
  );
}

function StatusDestinationStep({
  action,
  statusLabels,
  onBack,
  onCancel,
  onConfirm,
  onSetReminder,
}: {
  action: Action;
  statusLabels: Record<ActionStatus, string>;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: (destination: MoveDestination) => void;
  onSetReminder?: (afterDays: number) => void;
}) {
  const [pendingWaiting, setPendingWaiting] = useState(false);
  const [reminderDays, setReminderDays] = useState(String(action.waitingReminder?.afterDays ?? 3));
  const [reminderEnabled, setReminderEnabled] = useState(false);

  if (pendingWaiting) {
    const days = Number(reminderDays);
    const validDays = Number.isInteger(days) && days >= 1;
    return (
      <BottomSheet title="Déplacer - relance" onClose={onCancel}>
        <p style={{ fontWeight: 600 }}>Passer « {action.title} » en attente</p>
        <div className="choice-group">
          <label className="choice-option">
            <input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} />
            Activer une relance automatique
          </label>
        </div>
        {reminderEnabled && (
          <div className="field">
            <label htmlFor="reminder-days">Relance après (jours)</label>
            <input
              id="reminder-days"
              type="number"
              min={1}
              step={1}
              value={reminderDays}
              onChange={(event) => setReminderDays(event.target.value)}
              aria-invalid={!validDays}
            />
          </div>
        )}
        <div className="sheet-actions sheet-actions-inline">
          <button type="button" className="btn tap-target" style={{ flex: 1 }} onClick={() => setPendingWaiting(false)}>
            Retour
          </button>
          <button
            type="button"
            className="btn btn-primary tap-target"
            style={{ flex: 1 }}
            disabled={reminderEnabled && !validDays}
            onClick={() => {
              onConfirm({ axis: "status", status: "waiting" });
              if (reminderEnabled && validDays) onSetReminder?.(days);
            }}
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="Déplacer - choisir le statut" onClose={onCancel}>
      <p style={{ fontWeight: 600 }}>Nouveau statut</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {(Object.keys(statusLabels) as ActionStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className="status-select-btn"
            data-status={status}
            onClick={() => (status === "waiting" ? setPendingWaiting(true) : onConfirm({ axis: "status", status }))}
          >
            <StatusCheckIcon status={status} size={18} /> {statusLabels[status]}
          </button>
        ))}
      </div>
      <div className="choice-group">
        <button type="button" className="action-menu-item" style={{ justifyContent: "center", fontWeight: 600 }} onClick={onBack}>
          Retour
        </button>
      </div>
    </BottomSheet>
  );
}

function ScheduleDestinationStep({
  action,
  currentWeek,
  onBack,
  onCancel,
  onConfirm,
}: {
  action: Action;
  currentWeek: string;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: (destination: MoveDestination) => void;
}) {
  const [targetWeek, setTargetWeek] = useState(currentWeek);
  const requiresConfirmation = action.schedule?.granularity === "month";
  const [confirmed, setConfirmed] = useState(false);

  return (
    <BottomSheet title="Déplacer - choisir la semaine" onClose={onCancel}>
      <p style={{ fontWeight: 600 }}>Déplacer vers la semaine</p>
      <div className="field">
        <label htmlFor="move-target-week">Semaine cible</label>
        <input
          id="move-target-week"
          type="week"
          value={targetWeek}
          onChange={(event) => setTargetWeek(event.target.value)}
        />
      </div>

      {requiresConfirmation && (
        <div className="choice-group">
          <label className="choice-option">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            Je confirme le passage d'une planification mensuelle à une semaine précise.
          </label>
        </div>
      )}

      <div className="sheet-actions sheet-actions-inline">
        <button type="button" className="btn tap-target" onClick={onBack} style={{ flex: 1 }}>
          Retour
        </button>
        <button
          type="button"
          className="btn btn-primary tap-target"
          style={{ flex: 1 }}
          disabled={!targetWeek || (requiresConfirmation && !confirmed)}
          onClick={() =>
            onConfirm({
              axis: "schedule",
              to: { kind: "week", targetWeek, confirmed: requiresConfirmation ? confirmed : undefined },
            })
          }
        >
          Confirmer
        </button>
        <button type="button" className="btn btn-block tap-target sheet-actions-wide" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
}
