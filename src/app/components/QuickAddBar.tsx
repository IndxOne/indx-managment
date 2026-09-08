import { useRef, useState, type FormEvent } from "react";
import { IconMore, IconPlusCircle } from "./Icons";

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
      <button
        type="submit"
        className="icon-btn"
        disabled={!title.trim()}
        aria-label="Ajouter"
        style={{ color: "var(--color-accent)", flexShrink: 0 }}
      >
        <IconPlusCircle width={20} height={20} />
      </button>
      <input
        ref={inputRef}
        type="text"
        className="quick-add-input"
        placeholder={placeholder}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Nouvelle action"
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => onOpenFullForm(title.trim())}
        aria-label="Options avancées (type, priorité, phase)"
        style={{ flexShrink: 0 }}
      >
        <IconMore />
      </button>
    </form>
  );
}
