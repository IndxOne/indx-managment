import type { FormEvent } from "react";
import { useInlineCreate } from "../hooks/useInlineCreate";
import { IconMore, IconPlus } from "./Icons";

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
  const { title, setTitle, submit, inputRef } = useInlineCreate(onQuickAdd);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submit()) inputRef.current?.focus();
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <button type="submit" className="quick-add-plus" disabled={!title.trim()} aria-label="Ajouter">
        <IconPlus width={20} height={20} strokeWidth={2.4} />
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
