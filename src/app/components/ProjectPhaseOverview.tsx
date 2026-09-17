import { useState } from "react";
import type { Member } from "../../domain/member";
import type { Action, ActionStatus } from "../../domain/types";
import { PRIORITY_LABELS } from "../labels";
import { phaseLabel } from "../labels";
import { deriveWorkspaceStatus, deriveWorkspaceTopPriority, workspaceStatusLabel } from "../utils/workspace-summary";
import { ActionListSection } from "./ActionListSection";
import { IconChevronRight } from "./Icons";
import { QuickAddBar } from "./QuickAddBar";
import { EmptyState } from "./StateBlocks";

/**
 * Vue "Par étapes" d'un espace PROJET sur mobile (Lot B) : hiérarchie
 * verticale (Header -> Progression -> Phase actuelle -> Jalons suivants
 * collapsibles -> Actions), pour éviter le Kanban à défilement horizontal
 * forcé sur téléphone (cadrage produit). Le Kanban (`ColumnsView`) reste
 * inchangé pour desktop — `ProjectWorkspaceScreen` choisit entre les deux
 * uniquement via `useIsDesktop()`, aucune logique dupliquée ici : les mêmes
 * callbacks (créer/déplacer/éditer/etc.) et le même composant de liste
 * (`ActionListSection`, qui préserve la séparation "ouvrir le détail" vs
 * "cocher/terminer" déjà garantie par `ActionCard`) sont réutilisés tels quels.
 */
export function ProjectPhaseOverview({
  phases,
  actionsByPhase,
  statusLabels,
  timezone,
  resolveSyncStatus,
  members,
  currentPhase,
  onSelectPhase,
  onAddToPhase,
  onQuickCreate,
  onMove,
  onCycleStatus,
  onComplete,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
  onOpenDetail,
}: {
  phases: string[];
  actionsByPhase: Record<string, Action[]>;
  statusLabels: Record<ActionStatus, string>;
  timezone: string;
  resolveSyncStatus?: (action: Action) => "pending" | "conflict" | undefined;
  members?: Member[];
  currentPhase: string;
  onSelectPhase: (phase: string) => void;
  onAddToPhase: (phaseId: string, draftTitle?: string) => void;
  onQuickCreate: (phaseId: string, title: string) => void;
  onMove: (action: Action) => void;
  onCycleStatus: (action: Action) => void;
  onComplete: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
  onOpenNotes: (action: Action) => void;
  onOpenLink: (action: Action) => void;
  onOpenDetail: (action: Action) => void;
}) {
  const [otherPhasesOpen, setOtherPhasesOpen] = useState(false);
  const allActions = phases.flatMap((phase) => actionsByPhase[phase] ?? []);
  const doneCount = allActions.filter((action) => action.status === "done").length;
  const percent = allActions.length === 0 ? 0 : Math.round((doneCount / allActions.length) * 100);
  const status = deriveWorkspaceStatus(allActions);
  const topPriority = deriveWorkspaceTopPriority(allActions);
  const otherPhases = phases.filter((phase) => phase !== currentPhase);
  const currentActions = actionsByPhase[currentPhase] ?? [];

  if (phases.length === 0) {
    return <EmptyState title="Aucune phase" description="Cette approche métier n'a pas d'étapes à afficher." />;
  }

  return (
    <div className="project-phase-overview">
      <div className="project-overview-header">
        <span className={`phase-chip ${status === "done" ? "phase-chip-green" : status === "active" ? "phase-chip-blue" : "phase-chip-gray"}`}>
          {workspaceStatusLabel(status)}
        </span>
        {topPriority && (
          <span className={`phase-chip ${topPriority === "high" ? "phase-chip-red" : "phase-chip-orange"}`}>
            {PRIORITY_LABELS[topPriority]}
          </span>
        )}
      </div>

      {allActions.length > 0 && (
        <div className="project-overview-progress" aria-label="Progression du projet">
          <span className="progress-track" aria-hidden="true">
            <span className="progress-fill" style={{ width: `${percent}%` }} />
          </span>
          <span className="workspace-card-progress-label">
            {doneCount}/{allActions.length} ({percent}%)
          </span>
        </div>
      )}

      <section aria-labelledby="phase-current-title">
        <h2 id="phase-current-title" className="section-title">
          Phase actuelle
        </h2>
        <div className="phase-tab-scroller" role="tablist" aria-label="Phases du projet">
          {phases.map((phase) => (
            <button
              key={phase}
              type="button"
              role="tab"
              aria-selected={phase === currentPhase}
              className={`phase-tab-chip ${phase === currentPhase ? "phase-tab-chip-active" : ""}`}
              onClick={() => onSelectPhase(phase)}
            >
              {phaseLabel(phase)} ({(actionsByPhase[phase] ?? []).length})
            </button>
          ))}
        </div>

        <ActionListSection
          id="section-current-phase"
          title={phaseLabel(currentPhase)}
          actions={currentActions}
          timezone={timezone}
          statusLabels={statusLabels}
          emptyMessage="Aucune action dans cette phase."
          resolveSyncStatus={resolveSyncStatus}
          onMove={onMove}
          onCycleStatus={onCycleStatus}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onDisableReminder={onDisableReminder}
          onOpenNotes={onOpenNotes}
          onOpenLink={onOpenLink}
          onOpenDetail={onOpenDetail}
          phaseOptions={phases}
          members={members}
        />

        <QuickAddBar
          placeholder={`Ajouter à « ${phaseLabel(currentPhase)} »…`}
          onQuickAdd={(title) => onQuickCreate(currentPhase, title)}
          onOpenFullForm={(draftTitle) => onAddToPhase(currentPhase, draftTitle)}
        />
      </section>

      {otherPhases.length > 0 && (
        <section aria-labelledby="phase-other-title" style={{ marginTop: "var(--space-4)" }}>
          <button
            type="button"
            className="action-menu-row"
            aria-expanded={otherPhasesOpen}
            onClick={() => setOtherPhasesOpen((open) => !open)}
          >
            <span style={{ flex: 1, minWidth: 0 }} id="phase-other-title">
              <span className="action-menu-row-label">Jalons / phases suivantes</span>
              <span className="action-menu-row-sub">
                {otherPhases.length} autre{otherPhases.length > 1 ? "s" : ""} phase{otherPhases.length > 1 ? "s" : ""}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{ transform: otherPhasesOpen ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }}
            >
              <IconChevronRight width={18} height={18} />
            </span>
          </button>
          {otherPhasesOpen && (
            <div className="choice-group" style={{ marginTop: 8 }}>
              {otherPhases.map((phase) => (
                <button key={phase} type="button" className="action-menu-row" onClick={() => onSelectPhase(phase)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="action-menu-row-label">{phaseLabel(phase)}</span>
                    <span className="action-menu-row-sub">
                      {(actionsByPhase[phase] ?? []).length} action{(actionsByPhase[phase] ?? []).length > 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
