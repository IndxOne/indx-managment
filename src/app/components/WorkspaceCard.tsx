import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { KIND_LABELS } from "../labels";
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
      <button type="button" className="workspace-card" data-kind={workspace.kind} onClick={onSelect}>
        <div className="workspace-card-header">
          <span className="card-title">{workspace.name}</span>
          <span className={`badge badge-${workspace.kind}`}>{KIND_LABELS[workspace.kind]}</span>
        </div>
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
