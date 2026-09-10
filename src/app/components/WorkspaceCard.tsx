import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { computeWorkspaceSummary } from "../utils/workspace-summary";

export function WorkspaceCard({
  workspace,
  actions,
  timezone,
  onSelect,
}: {
  workspace: Workspace;
  actions: Action[];
  timezone: string;
  onSelect: () => void;
}) {
  const summary = computeWorkspaceSummary(actions, timezone);
  const hasPhases = (resolveWorkspacePreset(workspace).phaseTemplate ?? []).length > 0;
  const viewModeLabel = hasPhases ? "Par étapes" : "Par semaine";
  const description = workspace.description || (actions.length === 0 ? "Ajoutez votre première action." : null);

  return (
    <li>
      <button type="button" className="workspace-card" onClick={onSelect}>
        <span className="workspace-card-title">{workspace.name}</span>
        {description && <p className="workspace-card-desc">{description}</p>}
        <div className="workspace-card-footer">
          <span>
            {actions.length} action{actions.length > 1 ? "s" : ""} · {summary.doneCount} terminée
            {summary.doneCount > 1 ? "s" : ""}
          </span>
          <span className="workspace-card-viewmode">{viewModeLabel} →</span>
        </div>
      </button>
    </li>
  );
}
