import { useState } from "react";
import type { Action } from "../../domain/types";
import { BottomSheet } from "./BottomSheet";

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function NotesSheet({
  action,
  onClose,
  onAddNote,
}: {
  action: Action;
  onClose: () => void;
  onAddNote: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const notes = action.notes ?? [];

  function handleSubmit() {
    if (!text.trim()) return;
    onAddNote(text);
    setText("");
  }

  return (
    <BottomSheet title={`Notes - ${action.title}`} onClose={onClose}>
      <p style={{ fontWeight: 600 }}>Notes de « {action.title} »</p>

      {notes.length === 0 ? (
        <p className="action-sub">Aucune note pour l'instant.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((note) => {
            const isRecent = Date.now() - new Date(note.createdAt).getTime() < RECENT_THRESHOLD_MS;
            return (
              <li key={note.id} className="notes-list-item">
                <p>{note.text}</p>
                <time
                  className="action-sub"
                  dateTime={note.createdAt}
                  style={isRecent ? { color: "var(--color-accent)", fontWeight: 600 } : undefined}
                >
                  {DATE_FORMAT.format(new Date(note.createdAt))}
                </time>
              </li>
            );
          })}
        </ul>
      )}

      <div className="field">
        <label htmlFor="new-note-text">Ajouter une note</label>
        <textarea
          id="new-note-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet ouvert par une action explicite, focus attendu (pattern dialog APG)
          autoFocus
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block tap-target"
        disabled={!text.trim()}
        onClick={handleSubmit}
      >
        Ajouter la note
      </button>
      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onClose}>
        Fermer
      </button>
    </BottomSheet>
  );
}
