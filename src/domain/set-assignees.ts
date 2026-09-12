import type { Action } from "./types";

/**
 * Assignation d'une action à des membres (Lot 8B) : axe indépendant du
 * reste du domaine, même garantie qu'ailleurs (cadrage §6). Ne fait aucune
 * validation sur l'existence/l'état actif des membres — un membre désactivé
 * reste assignable pour rester visible sur les actions déjà assignées
 * (cf. brief Lot 8B : pas de suppression physique).
 */
export function setAssignees(action: Action, assigneeIds: string[], now?: string): Action {
  return { ...action, assigneeIds, updatedAt: now ?? new Date().toISOString() };
}
