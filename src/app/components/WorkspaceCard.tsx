import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { PRIORITY_LABELS } from "../labels";
import {
  computeWorkspaceSummary,
  deriveWorkspaceStatus,
  deriveWorkspaceTopPriority,
  workspaceStatusLabel,
} from "../utils/workspace-summary";

/**
 * Rangée de la liste des projets (Lot B — étend WorkspaceCard existant
 * plutôt que d'en créer un second composant) : nom, statut et priorité
 * dérivés des actions réelles (aucun champ persisté à ajouter, donc aucune
 * migration Supabase requise), progression, prochaine échéance et nombre
 * d'actions ouvertes. Reste une seule rangée compacte, pas une grande carte
 * décorative, conformément au cadrage "liste, pas des cards".
 */
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
  const status = deriveWorkspaceStatus(actions);
  const topPriority = deriveWorkspaceTopPriority(actions);
  const percent = actions.length === 0 ? 0 : Math.round((summary.doneCount / actions.length) * 100);
  const statusChipClass = status === "done" ? "phase-chip-green" : status === "active" ? "phase-chip-blue" : "phase-chip-gray";
  const priorityChipClass = topPriority === "high" ? "phase-chip-red" : "phase-chip-orange";

  return (
    <li>
      <button type="button" className="workspace-card" onClick={onSelect}>
        <div className="workspace-card-top">
          <span className="workspace-card-title">{workspace.name}</span>
          <span className={`phase-chip ${statusChipClass}`}>{workspaceStatusLabel(status)}</span>
          {topPriority && <span className={`phase-chip ${priorityChipClass}`}>{PRIORITY_LABELS[topPriority]}</span>}
        </div>
        {description && <p className="workspace-card-desc">{description}</p>}
        {actions.length > 0 && (
          <div className="workspace-card-progress-row">
            <span className="progress-track" aria-hidden="true">
              <span className="progress-fill" style={{ width: `${percent}%` }} />
            </span>
            <span className="workspace-card-progress-label">{percent}%</span>
          </div>
        )}
        <div className="workspace-card-footer">
          <span>
            {summary.relevantActionsCount} action{summary.relevantActionsCount > 1 ? "s" : ""} ouverte
            {summary.relevantActionsCount > 1 ? "s" : ""}
            {summary.nextDueLabel ? ` · Échéance ${summary.nextDueLabel}` : ""}
          </span>
          <span className="workspace-card-viewmode">{viewModeLabel} →</span>
        </div>
      </button>
    </li>
  );
}
