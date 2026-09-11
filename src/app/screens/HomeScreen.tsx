import { useEffect, useMemo, useState } from "react";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { deriveHomeBuckets } from "../utils/home-buckets";
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { ActionListSection } from "../components/ActionListSection";
import { EditActionSheet } from "../components/EditActionSheet";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { EmptyState } from "../components/StateBlocks";
import { UndoBanner } from "../components/UndoBanner";

/**
 * Accueil (Lot 7) : vue opérationnelle, pas un dashboard. Répond à 4
 * questions dans l'ordre — Aujourd'hui, En retard, Bloqué, Cette semaine —
 * en réutilisant le même moteur temporel que la vue Semaine complète
 * (`deriveHomeBuckets`, construit sur `deriveScheduleKeys`/`isOverdue` :
 * aucun second moteur calendrier). Même architecture d'écran que
 * AggregatedActionsScreen (RUN+PROJET agrégés, hooks undo/sync par action,
 * ActionDetailSheet) : les deux routes partagent la même logique, seul le
 * regroupement affiché diffère.
 *
 * Aucune création rapide globale ici (Lot 7 §D, option A) : Home agrège
 * plusieurs espaces sans qu'aucune règle de rattachement implicite
 * ("dernier espace actif") ne soit fiable — créer une action reste un
 * geste fait depuis un espace précis (RUN/PROJET) ou via son bouton "..."
 * (menu global déjà existant), inchangé par ce lot.
 */
export function HomeScreen({
  timezone,
  onNavigateToWorkspace,
  onOpenWeek,
}: {
  timezone: string;
  onNavigateToWorkspace: (workspaceId: string) => void;
  onOpenWeek: () => void;
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
  const [detailActionId, setDetailActionId] = useState<string | null>(null);

  const allActions = useMemo(
    () => state.workspaces.flatMap((workspace) => state.actionsByWorkspace[workspace.id] ?? []),
    [state.workspaces, state.actionsByWorkspace]
  );

  const buckets = useMemo(() => deriveHomeBuckets(allActions, timezone), [allActions, timezone]);

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
  const detailAction = detailActionId ? findAction(detailActionId) ?? null : null;

  const nothingToShow =
    buckets.today.length === 0 &&
    buckets.overdue.length === 0 &&
    buckets.blocked.length === 0 &&
    buckets.thisWeekPreview.length === 0;

  const commonSectionProps = {
    timezone,
    statusLabels: STATUS_LABELS_DEFAULT,
    resolveWorkspace,
    resolveStatusLabels,
    onOpenWorkspace: (action: Action) => onNavigateToWorkspace(action.workspaceId),
    onMove: setMovingAction,
    onCycleStatus: (action: Action) => move(action.workspaceId, action, { axis: "status", status: cycleStatus(action.status) }),
    onComplete: (action: Action) => move(action.workspaceId, action, { axis: "status", status: "done" as const }),
    onEdit: setEditingAction,
    onDelete: (action: Action) => remove(action.workspaceId, action),
    onDisableReminder: (action: Action) => disableReminder(action.workspaceId, action.id),
    onOpenNotes: (action: Action) => setNotesActionId(action.id),
    onOpenLink: (action: Action) => setLinkingActionId(action.id),
    onOpenDetail: (action: Action) => setDetailActionId(action.id),
    resolveSyncStatus,
  };

  return (
    <div>
      <div className="top-bar">
        <h1>Accueil</h1>
      </div>
      <div className="app-main">
        {nothingToShow ? (
          <EmptyState title="Rien à afficher" description="Aucune action urgente pour l'instant." />
        ) : (
          <>
            <ActionListSection
              id="section-home-today"
              title="Aujourd'hui"
              actions={buckets.today}
              emptyMessage="Rien pour aujourd'hui."
              {...commonSectionProps}
            />
            <ActionListSection
              id="section-home-overdue"
              title="En retard"
              actions={buckets.overdue}
              emptyMessage="Aucune action en retard."
              {...commonSectionProps}
            />
            <ActionListSection
              id="section-home-blocked"
              title="Bloqué"
              actions={buckets.blocked}
              emptyMessage="Aucune action bloquée."
              {...commonSectionProps}
            />
            <ActionListSection
              id="section-home-week"
              title="Cette semaine"
              actions={buckets.thisWeekPreview}
              emptyMessage="Rien de prévu plus tard cette semaine."
              {...commonSectionProps}
            />
            <button type="button" className="btn btn-block tap-target" style={{ marginBottom: "var(--space-4)" }} onClick={onOpenWeek}>
              Voir la semaine complète
            </button>
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

      {detailAction && (
        <ActionDetailSheet
          action={detailAction}
          phaseOptions={presetFor(detailAction.workspaceId)?.phaseTemplate ?? []}
          statusLabels={resolveStatusLabels(detailAction)}
          timezone={timezone}
          workspaces={state.workspaces}
          actionsByWorkspace={state.actionsByWorkspace}
          onClose={() => setDetailActionId(null)}
          onEdit={(edit) => editAction(detailAction.workspaceId, detailAction.id, edit)}
          onMove={(destination) => move(detailAction.workspaceId, detailAction, destination)}
          onSetReminder={(afterDays) => setReminder(detailAction.workspaceId, detailAction.id, afterDays)}
          onDisableReminder={() => disableReminder(detailAction.workspaceId, detailAction.id)}
          onAddNote={(text) => addNote(detailAction.workspaceId, detailAction.id, text)}
          onLink={(linkedId) => linkAction(detailAction.workspaceId, detailAction.id, linkedId)}
          onUnlink={() => unlinkAction(detailAction.workspaceId, detailAction.id)}
          onNavigate={onNavigateToWorkspace}
          onDelete={() => remove(detailAction.workspaceId, detailAction)}
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
