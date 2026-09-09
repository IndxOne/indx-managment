import { useRef, useState, type FormEvent } from "react";
import { ConvertNoteSheet } from "../components/ConvertNoteSheet";
import { EmptyState } from "../components/StateBlocks";
import { IconPlus } from "../components/Icons";
import { useStore } from "../adapters/temporary-store";

/**
 * Inbox de notes libres non rattachées à un espace : capture rapide, puis
 * triage plus tard — convertir en action (choix de l'espace/phase) ou
 * supprimer. Une note convertie disparaît du Carnet (son texte vit dans
 * l'action créée, reliée via sourceNoteId).
 */
export function CarnetScreen() {
  const { state, createCarnetNote, deleteCarnetNote, convertCarnetNote } = useStore();
  const [text, setText] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convertingNote = state.carnetNotes.find((note) => note.id === convertingId) ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    createCarnetNote(trimmed);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="top-bar">
        <h1>Carnet</h1>
      </div>
      <div className="app-main">
        <form className="quick-add" onSubmit={handleSubmit}>
          <button type="submit" className="quick-add-plus" disabled={!text.trim()} aria-label="Ajouter une note">
            <IconPlus width={20} height={20} strokeWidth={2.4} />
          </button>
          <input
            ref={inputRef}
            type="text"
            className="quick-add-input"
            placeholder="Noter une idée…"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Nouvelle note"
          />
        </form>

        {state.carnetNotes.length === 0 ? (
          <EmptyState
            title="Carnet vide"
            description="Note une idée sans l'attribuer tout de suite à un espace — tu la trieras plus tard."
          />
        ) : (
          <div className="action-card-list">
            {state.carnetNotes.map((note) => (
              <div className="action-card" key={note.id}>
                <span className="action-title">{note.text}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setConvertingId(note.id)}>
                    Convertir en action
                  </button>
                  <button type="button" className="btn-danger-text" onClick={() => deleteCarnetNote(note.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {convertingNote && (
        <ConvertNoteSheet
          note={convertingNote}
          workspaces={state.workspaces}
          onCancel={() => setConvertingId(null)}
          onConvert={(workspaceId, phaseId) => {
            convertCarnetNote(convertingNote.id, {
              workspaceId,
              title: convertingNote.text,
              itemType: "task",
              priority: "normal",
              phaseId,
            });
            setConvertingId(null);
          }}
        />
      )}
    </div>
  );
}
