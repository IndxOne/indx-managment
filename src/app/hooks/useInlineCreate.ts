import { useRef, useState } from "react";

/**
 * Saisie de titre + validation partagées par tout mécanisme de création
 * rapide (Lot 4 du renouveau produit) : "titre vide -> aucune création",
 * remise à zéro du champ après création pour enchaîner. Utilisé par
 * `QuickAddBar` (barre toujours visible) et par la création inline en
 * colonne de `ColumnsView` (CTA -> champ) — deux représentations, une
 * seule règle de validation, pas de logique dupliquée.
 */
export function useInlineCreate(onCreate: (title: string) => void) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(): boolean {
    const trimmed = title.trim();
    if (!trimmed) return false;
    onCreate(trimmed);
    setTitle("");
    return true;
  }

  function reset() {
    setTitle("");
  }

  return { title, setTitle, submit, reset, inputRef };
}
