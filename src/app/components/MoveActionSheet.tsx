import { useState } from "react";
import { formatIsoWeek } from "../../calendar/iso-week";
import type { Action, ActionStatus } from "../../domain/types";
import type { MoveAxis, MoveDestination } from "../../domain/move-action";
import { BottomSheet } from "./BottomSheet";

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
}: {
  action: Action;
  phaseOptions: string[];
  statusLabels: Record<ActionStatus, string>;
  onCancel: () => void;
  onConfirm: (destination: MoveDestination) => void;
}) {
  const [axis, setAxis] = useState<MoveAxis | null>(null);
  const currentWeek = formatIsoWeek(new Date().toISOString().slice(0, 10));

  if (axis === null) {
    return (
      <BottomSheet title="Déplacer — choisir l'axe" onClose={onCancel}>
        <p id="move-axis-heading" style={{ fontWeight: 600 }}>
          Déplacer « {action.title} »
        </p>
        <div className="choice-group" role="group" aria-labelledby="move-axis-heading">
          {(Object.keys(AXIS_LABELS) as MoveAxis[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="btn btn-block tap-target"
              onClick={() => setAxis(candidate)}
            >
              {AXIS_LABELS[candidate]}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-block tap-target" style={{ marginTop: 16 }} onClick={onCancel}>
          Annuler
        </button>
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
      <BottomSheet title="Déplacer — choisir la phase" onClose={onCancel}>
        <p style={{ fontWeight: 600 }}>Nouvelle phase</p>
        <div className="choice-group">
          {phaseOptions.map((phase) => (
            <button
              key={phase}
              type="button"
              className="btn btn-block tap-target"
              onClick={() => onConfirm({ axis: "phase", phaseId: phase })}
            >
              {phase}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-block tap-target" style={{ marginTop: 16 }} onClick={() => setAxis(null)}>
          Retour
        </button>
      </BottomSheet>
    );
  }

  // axis === "status"
  return (
    <BottomSheet title="Déplacer — choisir le statut" onClose={onCancel}>
      <p style={{ fontWeight: 600 }}>Nouveau statut</p>
      <div className="choice-group">
        {(Object.keys(statusLabels) as ActionStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className="btn btn-block tap-target"
            onClick={() => onConfirm({ axis: "status", status })}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 16 }} onClick={() => setAxis(null)}>
        Retour
      </button>
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
    <BottomSheet title="Déplacer — choisir la semaine" onClose={onCancel}>
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
        <label className="choice-option">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          Je confirme le passage d'une planification mensuelle à une semaine précise.
        </label>
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
