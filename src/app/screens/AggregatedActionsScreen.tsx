import { useEffect, useMemo, useState } from "react";
import { deriveScheduleKeys, type RelativeLabelKey } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { ActionListSection } from "../components/ActionListSection";
import { EditActionSheet } from "../components/EditActionSheet";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { EmptyState } from "../components/StateBlocks";
import { UndoBanner } from "../components/UndoBanner";

/**
 * Vue transversale (Aujourd'hui / Semaine) : agrège RUN et PROJET. Comme les
 * écrans d'espace, entièrement interactive (cycle de statut, déplacer,
 * éditer, notes, lien, supprimer+annuler) — chaque action garde son
 * workspaceId propre, donc les hooks undo et le préréglage (phases/libellés
 * de statut) sont résolus par action plutôt que fixés pour tout l'écran.
 */
export function AggregatedActionsScreen({
  title,
  includeLabels,
  emptyDescription,
  timezone,
  onNavigateToWorkspace,
}: {
  title: string;
  includeLabels: RelativeLabelKey[];
  emptyDescription: string;
  timezone: string;
  onNavigateToWorkspace: (workspaceId: string) => void;
}) {
  const { state, editAction, setReminder, disableReminder, refreshReminders, addNote, linkAction, unlinkAction } =
    useStore();

  const totalActionCount = useMemo(
    () => state.workspaces.reduce((sum, workspace) => sum + (state.actionsByWorkspace[workspace.id]?.length ?? 0), 0),
    [state.workspaces, state.actionsByWorkspace]
  );

  useEffect(() => {
    for (const workspace of state.workspaces) refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.workspaces.length, totalActionCount]);

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();
  const resolveSyncStatus = useActionSyncStatus();

  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);

  const { waiting, inView } = useMemo(() => {
    const waitingBucket: Action[] = [];
    const inViewBucket: Action[] = [];
    for (const workspace of state.workspaces) {
      for (const action of state.actionsByWorkspace[workspace.id] ?? []) {
        if (action.status === "waiting") {
          waitingBucket.push(action);
          continue;
        }
        const derived = deriveScheduleKeys(action.schedule, timezone);
        if (includeLabels.includes(derived.relativeLabel)) inViewBucket.push(action);
      }
    }
    return { waiting: waitingBucket, inView: inViewBucket };
  }, [state.workspaces, state.actionsByWorkspace, timezone, includeLabels]);

  function presetFor(workspaceId: string) {
    const workspace = state.workspaces.find((candidate) => candidate.id === workspaceId);
    return workspace ? resolveWorkspacePreset(workspace) : undefined;
  }

  function resolveWorkspace(action: Action) {
    const workspace = state.workspaces.find((candidate) => candidate.id === action.workspaceId);
    return workspace ? { name: workspace.name, kind: workspace.kind } : undefined;
  }

  function resolveStatusLabels(action: Action) {
    return { ...STATUS_LABELS_DEFAULT, ...presetFor(action.workspaceId)?.statusLabels };
  }

  function findAction(actionId: string): Action | undefined {
    for (const workspace of state.workspaces) {
      const found = (state.actionsByWorkspace[workspace.id] ?? []).find((candidate) => candidate.id === actionId);
      if (found) return found;
    }
    return undefined;
  }

  const notesAction = notesActionId ? findAction(notesActionId) ?? null : null;
  const linkingAction = linkingActionId ? findAction(linkingActionId) ?? null : null;

  const nothingToShow = waiting.length === 0 && inView.length === 0;

  return (
    <div>
      <div className="top-bar">
        <h1>{title}</h1>
      </div>
      <div className="app-main">
        {nothingToShow ? (
          <EmptyState title="Rien à afficher" description={emptyDescription} />
        ) : (
          <>
            <ActionListSection
              id="section-waiting"
              title="En attente"
              actions={waiting}
              timezone={timezone}
              statusLabels={STATUS_LABELS_DEFAULT}
              resolveWorkspace={resolveWorkspace}
              resolveStatusLabels={resolveStatusLabels}
              onOpenWorkspace={(action) => onNavigateToWorkspace(action.workspaceId)}
              onMove={setMovingAction}
              onCycleStatus={(action) => move(action.workspaceId, action, { axis: "status", status: cycleStatus(action.status) })}
              onEdit={setEditingAction}
              onDelete={(action) => remove(action.workspaceId, action)}
              onDisableReminder={(action) => disableReminder(action.workspaceId, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
              resolveSyncStatus={resolveSyncStatus}
            />
            <ActionListSection
              id="section-inview"
              title={title}
              actions={inView}
              timezone={timezone}
              statusLabels={STATUS_LABELS_DEFAULT}
              emptyMessage={emptyDescription}
              resolveWorkspace={resolveWorkspace}
              resolveStatusLabels={resolveStatusLabels}
              onOpenWorkspace={(action) => onNavigateToWorkspace(action.workspaceId)}
              onMove={setMovingAction}
              onCycleStatus={(action) => move(action.workspaceId, action, { axis: "status", status: cycleStatus(action.status) })}
              onEdit={setEditingAction}
              onDelete={(action) => remove(action.workspaceId, action)}
              onDisableReminder={(action) => disableReminder(action.workspaceId, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
              resolveSyncStatus={resolveSyncStatus}
            />
          </>
        )}
      </div>

      {movingAction && (
        <MoveActionSheet
          action={movingAction}
          phaseOptions={presetFor(movingAction.workspaceId)?.phaseTemplate ?? []}
          statusLabels={resolveStatusLabels(movingAction)}
          timezone={timezone}
          onCancel={() => setMovingAction(null)}
          onConfirm={(destination) => {
            move(movingAction.workspaceId, movingAction, destination);
            setMovingAction(null);
          }}
          onSetReminder={(afterDays) => setReminder(movingAction.workspaceId, movingAction.id, afterDays)}
        />
      )}

      {editingAction && (
        <EditActionSheet
          action={editingAction}
          onCancel={() => setEditingAction(null)}
          onSave={(edit) => {
            editAction(editingAction.workspaceId, editingAction.id, edit);
            setEditingAction(null);
          }}
        />
      )}

      {notesAction && (
        <NotesSheet
          action={notesAction}
          onClose={() => setNotesActionId(null)}
          onAddNote={(text) => addNote(notesAction.workspaceId, notesAction.id, text)}
        />
      )}

      {linkingAction && (
        <LinkActionSheet
          action={linkingAction}
          workspaces={state.workspaces}
          actionsByWorkspace={state.actionsByWorkspace}
          onClose={() => setLinkingActionId(null)}
          onLink={(linkedId) => {
            linkAction(linkingAction.workspaceId, linkingAction.id, linkedId);
            setLinkingActionId(null);
          }}
          onUnlink={() => unlinkAction(linkingAction.workspaceId, linkingAction.id)}
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
