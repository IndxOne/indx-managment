import { useState } from "react";
import { formatIsoWeek } from "../../calendar/iso-week";
import type { Action, ActionStatus } from "../../domain/types";
import type { MoveAxis, MoveDestination } from "../../domain/move-action";
import { phaseLabel } from "../labels";
import { BottomSheet } from "./BottomSheet";
import { StatusCheckIcon } from "./Icons";

const AXIS_LABELS: Record<MoveAxis, string> = {
  schedule: "Planification",
  phase: "Phase",
  status: "Statut",
};

export function MoveActionSheet({
  action,
  phaseOptions,
  statusLabels,
  onCancel,
  onConfirm,
  onSetReminder,
}: {
  action: Action;
  phaseOptions: string[];
  statusLabels: Record<ActionStatus, string>;
  onCancel: () => void;
  onConfirm: (destination: MoveDestination) => void;
  /** Appelé en plus de onConfirm si l'utilisateur active une relance en passant à "waiting". */
  onSetReminder?: (afterDays: number) => void;
}) {
  const [axis, setAxis] = useState<MoveAxis | null>(null);
  const currentWeek = formatIsoWeek(new Date().toISOString().slice(0, 10));

  if (axis === null) {
    return (
      <BottomSheet title="Déplacer - choisir l'axe" onClose={onCancel}>
        <p id="move-axis-heading" style={{ fontWeight: 600 }}>
          Déplacer « {action.title} »
        </p>
        <div className="choice-group" role="group" aria-labelledby="move-axis-heading" style={{ marginBottom: 8 }}>
          {(Object.keys(AXIS_LABELS) as MoveAxis[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="action-menu-item"
              style={{ justifyContent: "center" }}
              onClick={() => setAxis(candidate)}
            >
              {AXIS_LABELS[candidate]}
            </button>
          ))}
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
        <div className="choice-group" style={{ marginBottom: 8 }}>
          {phaseOptions.map((phase) => (
            <button
              key={phase}
              type="button"
              className="action-menu-item"
              style={{ justifyContent: "center" }}
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
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
      <div className="choice-group" style={{ marginBottom: 8 }}>
        {(Object.keys(statusLabels) as ActionStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className="action-menu-item"
            style={{ justifyContent: "center" }}
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

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
      </div>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onCancel}>
        Annuler
      </button>
    </BottomSheet>
  );
}
