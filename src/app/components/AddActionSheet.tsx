import { useState } from "react";
import type { Priority, WorkItemType } from "../../domain/types";
import type { RecurrenceFrequency } from "../../recurrence/recurrence-engine";
import { ITEM_TYPE_LABELS, ITEM_TYPE_OPTIONS, phaseLabel, PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];
const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle" },
];

export interface AddActionInput {
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  /** Présent seulement si "Répéter cette action" est activé. */
  repeat?: {
    frequency: RecurrenceFrequency;
    interval: number;
    startDate: string;
    endDate?: string;
  };
}

export function AddActionSheet({
  phaseOptions,
  defaultPhaseId,
  initialTitle,
  onCancel,
  onCreate,
}: {
  phaseOptions?: string[];
  defaultPhaseId?: string;
  initialTitle?: string;
  onCancel: () => void;
  onCreate: (input: AddActionInput) => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [itemType, setItemType] = useState<WorkItemType>("task");
  const [priority, setPriority] = useState<Priority>("normal");
  const [phaseId, setPhaseId] = useState<string | undefined>(defaultPhaseId ?? phaseOptions?.[0]);
  const [error, setError] = useState<string | null>(null);

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [interval, setInterval] = useState("1");
  const [endDate, setEndDate] = useState("");
  const intervalValue = Number(interval);
  const intervalValid = Number.isInteger(intervalValue) && intervalValue >= 1;

  function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (repeatEnabled && !intervalValid) {
      setError("L'intervalle de répétition doit être un nombre entier >= 1.");
      return;
    }
    onCreate({
      title: title.trim(),
      itemType,
      priority,
      phaseId,
      repeat: repeatEnabled
        ? {
            frequency,
            interval: intervalValue,
            startDate: new Date().toISOString().slice(0, 10),
            endDate: endDate || undefined,
          }
        : undefined,
    });
  }

  return (
    <BottomSheet title="Ajouter une action" onClose={onCancel}>
      <div className="field">
        <label htmlFor="new-action-title">Titre</label>
        <input
          id="new-action-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet ouvert par une action explicite, focus attendu (pattern dialog APG)
          autoFocus
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="new-action-type">Type</label>
        <select id="new-action-type" value={itemType} onChange={(event) => setItemType(event.target.value as WorkItemType)}>
          {ITEM_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ITEM_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="new-action-priority">Priorité</label>
        <select id="new-action-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {phaseOptions && phaseOptions.length > 0 && (
        <div className="field">
          <label htmlFor="new-action-phase">Phase</label>
          <select id="new-action-phase" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
            {phaseOptions.map((phase) => (
              <option key={phase} value={phase}>
                {phaseLabel(phase)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="choice-group" style={{ marginBottom: 8 }}>
        <label className="choice-option">
          <input type="checkbox" checked={repeatEnabled} onChange={(event) => setRepeatEnabled(event.target.checked)} />
          Répéter cette action
        </label>
      </div>

      {repeatEnabled && (
        <>
          <div className="field">
            <label htmlFor="new-action-frequency">Fréquence</label>
            <select
              id="new-action-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="new-action-interval">Tous les combien</label>
            <input
              id="new-action-interval"
              type="number"
              min={1}
              step={1}
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
              aria-invalid={!intervalValid}
            />
          </div>

          <div className="field">
            <label htmlFor="new-action-end-date">Jusqu'au (optionnel)</label>
            <input
              id="new-action-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </>
      )}

      <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleSubmit}>
        Créer l'action
      </button>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onCancel}>
        Annuler
      </button>
    </BottomSheet>
  );
}
