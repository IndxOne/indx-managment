import type { Action, Priority, WorkItemType } from "./types";

/**
 * Édition du contenu d'une action (titre/description/priorité/type),
 * distincte des axes de déplacement (schedule/phase/status). N'écrit
 * jamais schedule, phaseId, status ni les champs de relance : un axe
 * indépendant de plus, même garantie qu'ailleurs dans le domaine
 * (cadrage §6).
 */
export interface ActionContentEdit {
  title?: string;
  description?: string;
  priority?: Priority;
  itemType?: WorkItemType;
}

export function editActionContent(action: Action, edit: ActionContentEdit, now?: string): Action {
  const title = edit.title !== undefined ? edit.title.trim() : action.title;
  if (!title) {
    throw new Error("Le titre de l'action est requis");
  }
  return {
    ...action,
    title,
    description: edit.description !== undefined ? edit.description : action.description,
    priority: edit.priority ?? action.priority,
    itemType: edit.itemType ?? action.itemType,
    updatedAt: now ?? new Date().toISOString(),
  };
}
