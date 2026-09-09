import { useMemo, useState } from "react";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus } from "../../domain/types";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { ActionListSection } from "../components/ActionListSection";
import { EditActionSheet } from "../components/EditActionSheet";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { EmptyState } from "../components/StateBlocks";
import { UndoBanner } from "../components/UndoBanner";
import { IconChevronRight } from "../components/Icons";

/**
 * Drill-down depuis une tuile de statut du Hub : mêmes actions que
 * RemindersScreen (vue transversale interactive), filtrées par statut
 * au lieu de "en attente + relance". Accessible uniquement depuis le
 * Hub, donc bouton retour dédié plutôt que MoreSubNav.
 */
export function ActionsByStatusScreen({
  status,
  timezone,
  onBack,
  onNavigateToWorkspace,
}: {
  status: ActionStatus;
  timezone: string;
  onBack: () => void;
  onNavigateToWorkspace: (workspaceId: string) => void;
}) {
  const { state, editAction, setReminder, disableReminder, addNote, linkAction, unlinkAction } = useStore();
  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();

  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);

  const entries = useMemo(() => {
    const result: Action[] = [];
    for (const workspace of state.workspaces) {
      for (const action of state.actionsByWorkspace[workspace.id] ?? []) {
        if (action.status === status) result.push(action);
      }
    }
    return result;
  }, [state, status]);

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

  return (
    <div>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Retour au Hub">
            <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h1>{STATUS_LABELS_DEFAULT[status]}</h1>
        </div>
      </div>
      <div className="app-main">
        {entries.length === 0 ? (
          <EmptyState title="Aucune action" description="Aucune action dans ce statut pour l'instant." />
        ) : (
          <ActionListSection
            id="section-actions-by-status"
            title={`${STATUS_LABELS_DEFAULT[status]} (${entries.length})`}
            actions={entries}
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
          />
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
