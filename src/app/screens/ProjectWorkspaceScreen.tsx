import { useEffect, useMemo, useState } from "react";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action, ActionStatus } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { phaseLabel, STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { ActionCard } from "../components/ActionCard";
import { AddActionSheet } from "../components/AddActionSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState } from "../components/StateBlocks";

type ProjectMode = "phase" | "week";

export function ProjectWorkspaceScreen({
  workspace,
  timezone,
  onOpenSettings,
}: {
  workspace: Workspace;
  timezone: string;
  onOpenSettings: () => void;
}) {
  const { state, createAction, editAction, setReminder, disableReminder, refreshReminders } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = state.actionsByWorkspace[workspace.id] ?? [];
  const phases = preset.phaseTemplate ?? [];

  useEffect(() => {
    refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id, allActions.length]);

  const [mode, setMode] = useState<ProjectMode>("phase");
  const [currentPhase, setCurrentPhase] = useState<string | undefined>(phases[0]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo(workspace.id);
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo(workspace.id);

  const phaseActions = useMemo(
    () => allActions.filter((action) => action.phaseId === currentPhase),
    [allActions, currentPhase]
  );
  const milestones = phaseActions.filter((action) => action.itemType === "milestone");
  const decisions = phaseActions.filter((action) => action.itemType === "decision");
  const risks = phaseActions.filter((action) => action.itemType === "risk");
  const deliverables = phaseActions.filter(
    (action) => !["milestone", "decision", "risk"].includes(action.itemType)
  );

  const weekActions = useMemo(() => {
    if (mode !== "week") return [];
    return allActions.filter((action) => {
      const derived = deriveScheduleKeys(action.schedule, timezone);
      return ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
    });
  }, [allActions, mode, timezone]);

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>PROJET</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn tap-target"
            onClick={() => setMode(mode === "phase" ? "week" : "phase")}
          >
            {mode === "phase" ? "Vue semaine" : "Vue phases"}
          </button>
          <button type="button" className="btn tap-target" onClick={onOpenSettings} aria-label="Paramètres de l'espace">
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>

      <div className="app-main">
        {mode === "phase" ? (
          <>
            {phases.length === 0 ? (
              <EmptyState
                title="Aucune phase configurée"
                description="Cet espace PROJET fonctionne sans découpage en phases pour l'instant."
              />
            ) : (
              <>
                <div className="segmented" role="tablist" aria-label="Sélecteur de phases">
                  {phases.map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      role="tab"
                      aria-selected={currentPhase === phase}
                      aria-current={currentPhase === phase}
                      className="segmented-item"
                      onClick={() => setCurrentPhase(phase)}
                    >
                      {phaseLabel(phase)}
                    </button>
                  ))}
                </div>

                <PhaseSection
                  id="section-milestones"
                  title="Jalons"
                  actions={milestones}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                />

                <PhaseSection
                  id="section-decisions"
                  title="Décisions"
                  actions={decisions}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                />

                <PhaseSection
                  id="section-risks"
                  title="Risques"
                  actions={risks}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                />

                <section aria-labelledby="section-deliverables">
                  <h2 id="section-deliverables" className="section-title">
                    Actions et livrables
                  </h2>
                  {deliverables.length === 0 ? (
                    <EmptyState title="Aucune action dans cette phase" description="Ajoutez une action ou un livrable." />
                  ) : (
                    deliverables.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        timezone={timezone}
                        statusLabel={statusLabels[action.status]}
                        onMove={() => setMovingAction(action)}
                        onEdit={() => setEditingAction(action)}
                        onDelete={() => remove(action)}
                        onDisableReminder={() => disableReminder(workspace.id, action.id)}
                      />
                    ))
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          <section aria-labelledby="section-week">
            <h2 id="section-week" className="section-title">
              Cette semaine
            </h2>
            {weekActions.length === 0 ? (
              <EmptyState title="Rien cette semaine" description="Aucune action planifiée dans les 7 prochains jours." />
            ) : (
              weekActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  timezone={timezone}
                  statusLabel={statusLabels[action.status]}
                  onMove={() => setMovingAction(action)}
                  onEdit={() => setEditingAction(action)}
                  onDelete={() => remove(action)}
                  onDisableReminder={() => disableReminder(workspace.id, action.id)}
                />
              ))
            )}
          </section>
        )}
      </div>

      <button type="button" className="btn btn-primary btn-fab" onClick={() => setAddSheetOpen(true)} aria-label="Ajouter une action">
        <span aria-hidden="true">+</span>
      </button>

      {addSheetOpen && (
        <AddActionSheet
          phaseOptions={phases}
          onCancel={() => setAddSheetOpen(false)}
          onCreate={(input) => {
            createAction({ workspaceId: workspace.id, ...input });
            setAddSheetOpen(false);
          }}
        />
      )}

      {movingAction && (
        <MoveActionSheet
          action={movingAction}
          phaseOptions={phases}
          statusLabels={statusLabels}
          onCancel={() => setMovingAction(null)}
          onConfirm={(destination) => {
            move(movingAction, destination);
            setMovingAction(null);
          }}
          onSetReminder={(afterDays) => setReminder(workspace.id, movingAction.id, afterDays)}
        />
      )}

      {editingAction && (
        <EditActionSheet
          action={editingAction}
          onCancel={() => setEditingAction(null)}
          onSave={(edit) => {
            editAction(workspace.id, editingAction.id, edit);
            setEditingAction(null);
          }}
        />
      )}

      {pendingUndo && <UndoBanner message="Déplacement effectué." onUndo={cancelLastMove} />}
      {pendingDeleteUndo && (
        <UndoBanner
          message="Action supprimée."
          onUndo={cancelLastDelete}
          style={pendingUndo ? { bottom: "calc(var(--bottom-nav-height) + 72px)" } : undefined}
        />
      )}
    </div>
  );
}

function PhaseSection({
  id,
  title,
  actions,
  timezone,
  statusLabels,
  onMove,
  onEdit,
  onDelete,
  onDisableReminder,
}: {
  id: string;
  title: string;
  actions: Action[];
  timezone: string;
  statusLabels: Record<ActionStatus, string>;
  onMove: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {actions.map((action) => (
        <ActionCard
          key={action.id}
          action={action}
          timezone={timezone}
          statusLabel={statusLabels[action.status]}
          onMove={() => onMove(action)}
          onEdit={() => onEdit(action)}
          onDelete={() => onDelete(action)}
          onDisableReminder={() => onDisableReminder(action)}
        />
      ))}
    </section>
  );
}
