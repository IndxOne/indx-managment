import { useState } from "react";
import type { Action, Priority, WorkItemType } from "../../domain/types";
import type { ActionContentEdit } from "../../domain/edit-action";
import { ITEM_TYPE_LABELS, ITEM_TYPE_OPTIONS, PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

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
  const [description, setDescription] = useState(action.description ?? "");
  const [itemType, setItemType] = useState<WorkItemType>(action.itemType);
  const [priority, setPriority] = useState<Priority>(action.priority);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    onSave({ title, description, itemType, priority });
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
        <label htmlFor="edit-action-description">Description</label>
        <textarea
          id="edit-action-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Détails, contexte, lien utile…"
        />
      </div>

      <div className="field">
        <label htmlFor="edit-action-type">Type</label>
        <select id="edit-action-type" value={itemType} onChange={(event) => setItemType(event.target.value as WorkItemType)}>
          {ITEM_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ITEM_TYPE_LABELS[option]}
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

      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleSubmit}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-block tap-target" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
}
