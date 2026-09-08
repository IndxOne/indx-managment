import { useRef, useState, type FormEvent } from "react";

/**
 * Capture rapide façon Columns : un seul champ toujours visible, Entrée
 * crée l'action immédiatement (type "task", priorité normale) sans ouvrir
 * de sheet, le focus reste sur le champ pour enchaîner. Le bouton "…" ouvre
 * le formulaire complet (type, priorité, phase) pour les cas moins courants.
 */
export function QuickAddBar({
  onQuickAdd,
  onOpenFullForm,
  placeholder = "Ajouter une action…",
}: {
  onQuickAdd: (title: string) => void;
  onOpenFullForm: (draftTitle: string) => void;
  placeholder?: string;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onQuickAdd(trimmed);
    setTitle("");
    inputRef.current?.focus();
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className="quick-add-input"
        placeholder={placeholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Nouvelle action"
      />
      <button type="submit" className="btn btn-primary tap-target" disabled={!title.trim()} aria-label="Ajouter">
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        className="btn tap-target"
        onClick={() => onOpenFullForm(title.trim())}
        aria-label="Options avancées (type, priorité, phase)"
      >
        <span aria-hidden="true">⋯</span>
      </button>
    </form>
  );
}
