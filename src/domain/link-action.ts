import type { Action } from "./types";

/**
 * Lien simple entre deux actions (RUN ou PROJET), non bidirectionnel : lier
 * A à B ne modifie jamais B. Sert à référencer une dépendance sans dupliquer
 * la carte dans plusieurs colonnes (cf. alias de carte columns.app, version
 * allégée). Axe indépendant du reste du domaine (cadrage §6).
 */
export function linkAction(action: Action, linkedActionId: string, now?: string): Action {
  if (linkedActionId === action.id) {
    throw new Error("Une action ne peut pas être liée à elle-même");
  }
  return { ...action, linkedActionId, updatedAt: now ?? new Date().toISOString() };
}

export function unlinkAction(action: Action, now?: string): Action {
  return { ...action, linkedActionId: undefined, updatedAt: now ?? new Date().toISOString() };
}
