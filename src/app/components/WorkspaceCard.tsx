import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { APPROACH_LABELS, KIND_LABELS } from "../labels";
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

  return (
    <li>
      <button type="button" className="card" onClick={onSelect}>
        <div className="card-header">
          <span className="card-title">{workspace.name}</span>
          <span className={`badge badge-${workspace.kind}`}>{KIND_LABELS[workspace.kind]}</span>
        </div>
        <div className="card-meta">
          <span>{APPROACH_LABELS[workspace.approach]}</span>
          <span>
            {summary.relevantActionsCount}{" "}
            {summary.relevantActionsCount > 1 ? "actions" : "action"}
          </span>
          <span>{summary.nextDueLabel ? `Échéance : ${summary.nextDueLabel}` : "Aucune échéance"}</span>
        </div>
      </button>
    </li>
  );
}
