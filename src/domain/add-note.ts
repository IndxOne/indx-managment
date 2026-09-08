import type { Action } from "./types";

/**
 * Ajoute une note horodatée à l'action (journal append-only, jamais édité
 * ni supprimé après coup — cf. fil de discussion columns.app, version
 * allégée texte seul). Axe indépendant des autres champs, même garantie
 * qu'ailleurs dans le domaine (cadrage §6).
 */
export function addNote(action: Action, id: string, text: string, now?: string): Action {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Le texte de la note est requis");
  }
  const createdAt = now ?? new Date().toISOString();
  return {
    ...action,
    notes: [...(action.notes ?? []), { id, text: trimmed, createdAt }],
    updatedAt: createdAt,
  };
}
