import type { Workspace } from "../../domain/workspace";

/**
 * Espace cible par défaut pour la création rapide globale (bouton central de
 * la barre basse) — placeholder minimal du Lot A : RUN est la file
 * opérationnelle du quotidien, donc le choix le plus probable pour une
 * création "sans contexte" ; à défaut, le premier espace disponible. Le
 * sélecteur de destination complet ("Que voulez-vous créer ?") est le
 * travail du Lot B — ceci reste volontairement simple.
 */
export function resolveQuickCreateWorkspace(workspaces: readonly Workspace[]): Workspace | undefined {
  return workspaces.find((workspace) => workspace.kind === "run") ?? workspaces[0];
}
