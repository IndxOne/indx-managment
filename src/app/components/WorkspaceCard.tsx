import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { APPROACH_LABELS, KIND_LABELS } from "../labels";
import { computeWorkspaceSummary } from "../utils/workspace-summary";
import { IconChevronRight, IconGrid, IconSun } from "./Icons";

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
  const Icon = workspace.kind === "run" ? IconSun : IconGrid;

  return (
    <li>
      <button type="button" className="workspace-card" data-kind={workspace.kind} onClick={onSelect}>
        <span className="workspace-icon" data-kind={workspace.kind} aria-hidden="true">
          <Icon width={19} height={19} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="card-title" style={{ display: "block" }}>
            {workspace.name}
          </span>
          <span className="card-meta" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span>{KIND_LABELS[workspace.kind]}</span>
            <span>{APPROACH_LABELS[workspace.approach]}</span>
            <span>
              {summary.relevantActionsCount} {summary.relevantActionsCount > 1 ? "actions" : "action"}
            </span>
            <span>{summary.nextDueLabel ? `Échéance : ${summary.nextDueLabel}` : "Aucune échéance"}</span>
          </span>
        </span>
        <IconChevronRight className="chevron" width={11} height={11} />
      </button>
    </li>
  );
}
