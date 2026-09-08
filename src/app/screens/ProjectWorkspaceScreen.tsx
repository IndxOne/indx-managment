import { useEffect, useMemo, useState } from "react";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { phaseLabel, STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { ActionListSection } from "../components/ActionListSection";
import { AddActionSheet } from "../components/AddActionSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { IconSettings } from "../components/Icons";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { QuickAddBar } from "../components/QuickAddBar";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState } from "../components/StateBlocks";

type ProjectMode = "phase" | "week";

export function ProjectWorkspaceScreen({
  workspace,
  timezone,
  onOpenSettings,
  onNavigateToWorkspace,
}: {
  workspace: Workspace;
  timezone: string;
  onOpenSettings: () => void;
  onNavigateToWorkspace: (workspaceId: string) => void;
}) {
  const { state, createAction, editAction, setReminder, disableReminder, refreshReminders, addNote, linkAction, unlinkAction } =
    useStore();
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
  const [addSheetDraftTitle, setAddSheetDraftTitle] = useState("");
  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const notesAction = allActions.find((action) => action.id === notesActionId) ?? null;
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);
  const linkingAction = allActions.find((action) => action.id === linkingActionId) ?? null;

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
            <IconSettings />
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

                <QuickAddBar
                  onQuickAdd={(title) =>
                    createAction({ workspaceId: workspace.id, title, itemType: "task", priority: "normal", phaseId: currentPhase })
                  }
                  onOpenFullForm={(draftTitle) => {
                    setAddSheetDraftTitle(draftTitle);
                    setAddSheetOpen(true);
                  }}
                  placeholder={`Ajouter à « ${phaseLabel(currentPhase ?? "")} »…`}
                />

                <ActionListSection
                  id="section-milestones"
                  title="Jalons"
                  actions={milestones}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onCycleStatus={(action) => move(action, { axis: "status", status: cycleStatus(action.status) })}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                  onOpenNotes={(action) => setNotesActionId(action.id)}
                  onOpenLink={(action) => setLinkingActionId(action.id)}
                />

                <ActionListSection
                  id="section-decisions"
                  title="Décisions"
                  actions={decisions}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onCycleStatus={(action) => move(action, { axis: "status", status: cycleStatus(action.status) })}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                  onOpenNotes={(action) => setNotesActionId(action.id)}
                  onOpenLink={(action) => setLinkingActionId(action.id)}
                />

                <ActionListSection
                  id="section-risks"
                  title="Risques"
                  actions={risks}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onCycleStatus={(action) => move(action, { axis: "status", status: cycleStatus(action.status) })}
                  onEdit={setEditingAction}
                  onDelete={remove}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                  onOpenNotes={(action) => setNotesActionId(action.id)}
                  onOpenLink={(action) => setLinkingActionId(action.id)}
                />

                {deliverables.length === 0 ? (
                  <section aria-labelledby="section-deliverables">
                    <h2 id="section-deliverables" className="section-title">
                      Actions et livrables
                    </h2>
                    <EmptyState title="Aucune action dans cette phase" description="Ajoutez une action ou un livrable." />
                  </section>
                ) : (
                  <ActionListSection
                    id="section-deliverables"
                    title="Actions et livrables"
                    actions={deliverables}
                    timezone={timezone}
                    statusLabels={statusLabels}
                    onMove={setMovingAction}
                    onCycleStatus={(action) => move(action, { axis: "status", status: cycleStatus(action.status) })}
                    onEdit={setEditingAction}
                    onDelete={remove}
                    onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                    onOpenNotes={(action) => setNotesActionId(action.id)}
                    onOpenLink={(action) => setLinkingActionId(action.id)}
                  />
                )}
              </>
            )}
          </>
        ) : weekActions.length === 0 ? (
          <section aria-labelledby="section-week">
            <h2 id="section-week" className="section-title">
              Cette semaine
            </h2>
            <EmptyState title="Rien cette semaine" description="Aucune action planifiée dans les 7 prochains jours." />
          </section>
        ) : (
          <ActionListSection
            id="section-week"
            title="Cette semaine"
            actions={weekActions}
            timezone={timezone}
            statusLabels={statusLabels}
            onMove={setMovingAction}
            onCycleStatus={(action) => move(action, { axis: "status", status: cycleStatus(action.status) })}
            onEdit={setEditingAction}
            onDelete={remove}
            onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
            onOpenNotes={(action) => setNotesActionId(action.id)}
            onOpenLink={(action) => setLinkingActionId(action.id)}
          />
        )}
      </div>

      {addSheetOpen && (
        <AddActionSheet
          phaseOptions={phases}
          defaultPhaseId={currentPhase}
          initialTitle={addSheetDraftTitle}
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

      {notesAction && (
        <NotesSheet
          action={notesAction}
          onClose={() => setNotesActionId(null)}
          onAddNote={(text) => addNote(workspace.id, notesAction.id, text)}
        />
      )}

      {linkingAction && (
        <LinkActionSheet
          action={linkingAction}
          workspaces={state.workspaces}
          actionsByWorkspace={state.actionsByWorkspace}
          onClose={() => setLinkingActionId(null)}
          onLink={(linkedId) => {
            linkAction(workspace.id, linkingAction.id, linkedId);
            setLinkingActionId(null);
          }}
          onUnlink={() => unlinkAction(workspace.id, linkingAction.id)}
          onNavigate={onNavigateToWorkspace}
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
