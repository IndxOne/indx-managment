import { useState } from "react";
import type { Priority, WorkItemType } from "../../domain/types";
import { ITEM_TYPE_LABELS, ITEM_TYPE_OPTIONS, phaseLabel, PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];

export function AddActionSheet({
  phaseOptions,
  onCancel,
  onCreate,
}: {
  phaseOptions?: string[];
  onCancel: () => void;
  onCreate: (input: { title: string; itemType: WorkItemType; priority: Priority; phaseId?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<WorkItemType>("task");
  const [priority, setPriority] = useState<Priority>("normal");
  const [phaseId, setPhaseId] = useState<string | undefined>(phaseOptions?.[0]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    onCreate({ title: title.trim(), itemType, priority, phaseId });
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

      <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleSubmit}>
        Ajouter
      </button>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onCancel}>
        Annuler
      </button>
    </BottomSheet>
  );
}
