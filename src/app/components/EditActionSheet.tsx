import { useState } from "react";
import type { Action, Priority, WorkItemType } from "../../domain/types";
import type { ActionContentEdit } from "../../domain/edit-action";
import { PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

const ITEM_TYPE_OPTIONS: WorkItemType[] = ["task", "request", "incident", "maintenance", "deliverable", "milestone"];
const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];

export function EditActionSheet({
  action,
  onCancel,
  onSave,
}: {
  action: Action;
  onCancel: () => void;
  onSave: (edit: ActionContentEdit) => void;
}) {
  const [title, setTitle] = useState(action.title);
  const [itemType, setItemType] = useState<WorkItemType>(action.itemType);
  const [priority, setPriority] = useState<Priority>(action.priority);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    onSave({ title, itemType, priority });
  }

  return (
    <BottomSheet title="Éditer l'action" onClose={onCancel}>
      <div className="field">
        <label htmlFor="edit-action-title">Titre</label>
        <input
          id="edit-action-title"
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
        <label htmlFor="edit-action-type">Type</label>
        <select id="edit-action-type" value={itemType} onChange={(event) => setItemType(event.target.value as WorkItemType)}>
          {ITEM_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="edit-action-priority">Priorité</label>
        <select id="edit-action-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleSubmit}>
        Enregistrer
      </button>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onCancel}>
        Annuler
      </button>
    </BottomSheet>
  );
}
