import type { Action, Priority, ProfessionalApproach } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { deriveWorkspaceStatus, deriveWorkspaceTopPriority, type WorkspaceDerivedStatus } from "./workspace-summary";

export interface WorkspaceFilters {
  statuses: ReadonlySet<WorkspaceDerivedStatus>;
  priorities: ReadonlySet<Priority>;
  approaches: ReadonlySet<ProfessionalApproach>;
}

export const EMPTY_WORKSPACE_FILTERS: WorkspaceFilters = {
  statuses: new Set(),
  priorities: new Set(),
  approaches: new Set(),
};

export function hasActiveWorkspaceFilters(filters: WorkspaceFilters): boolean {
  return filters.statuses.size > 0 || filters.priorities.size > 0 || filters.approaches.size > 0;
}

/**
 * Filtre la liste des projets (§15) — mêmes dérivations que la carte
 * (Lot B, `workspace-summary.ts`) : statut et priorité ne sont jamais des
 * champs persistés séparés, uniquement calculés depuis les actions réelles.
 */
export function applyWorkspaceFilters(
  workspaces: Workspace[],
  actionsByWorkspace: Record<string, Action[]>,
  filters: WorkspaceFilters
): Workspace[] {
  return workspaces.filter((workspace) => {
    const actions = actionsByWorkspace[workspace.id] ?? [];
    if (filters.statuses.size > 0 && !filters.statuses.has(deriveWorkspaceStatus(actions))) return false;
    if (filters.priorities.size > 0) {
      const topPriority = deriveWorkspaceTopPriority(actions);
      if (!topPriority || !filters.priorities.has(topPriority)) return false;
    }
    if (filters.approaches.size > 0 && !filters.approaches.has(workspace.approach)) return false;
    return true;
  });
}
