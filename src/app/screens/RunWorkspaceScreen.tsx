import { useEffect, useMemo, useState } from "react";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { ActionListSection } from "../components/ActionListSection";
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { AddActionSheet } from "../components/AddActionSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { FilterSheet } from "../components/FilterSheet";
import { QuickFilterChips } from "../components/QuickFilterChips";
import { IconSettings } from "../components/Icons";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { QuickAddBar } from "../components/QuickAddBar";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState, NoResultsState } from "../components/StateBlocks";
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, type ActionFilters } from "../utils/filter-actions";

type RunView = "today" | "week";

export function RunWorkspaceScreen({
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
  const {
    state,
    createAction,
    createRecurringRule,
    editAction,
    setReminder,
    disableReminder,
    refreshReminders,
    addNote,
    linkAction,
    unlinkAction,
  } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = useMemo(() => state.actionsByWorkspace[workspace.id] ?? [], [state.actionsByWorkspace, workspace.id]);

  // Vérifie les relances devenues dues à chaque affichage / changement de
  // la liste (pas d'ordonnanceur en tâche de fond en Lot 3 — cf. Lot 5).
  useEffect(() => {
    refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id, allActions.length]);

  const [view, setView] = useState<RunView>(preset.defaultView === "day" ? "today" : "week");
  const [filters, setFilters] = useState<ActionFilters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetDraftTitle, setAddSheetDraftTitle] = useState("");
  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const notesAction = allActions.find((action) => action.id === notesActionId) ?? null;
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);
  const linkingAction = allActions.find((action) => action.id === linkingActionId) ?? null;

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const resolveSyncStatus = useActionSyncStatus();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();

  const filtered = useMemo(() => applyFilters(allActions, filters), [allActions, filters]);

  const buckets = useMemo(() => {
    const waiting: Action[] = [];
    const inView: Action[] = [];
    const unscheduled: Action[] = [];

    for (const action of filtered) {
      if (action.status === "waiting") waiting.push(action);
      const derived = deriveScheduleKeys(action.schedule, timezone);
      if (derived.relativeLabel === "unscheduled") {
        if (action.status !== "waiting") unscheduled.push(action);
        continue;
      }
      const withinView =
        view === "today" ? derived.relativeLabel === "today" : ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
      if (withinView && action.status !== "waiting") {
        inView.push(action);
      }
    }
    return { waiting, inView, unscheduled };
  }, [filtered, timezone, view]);

  const nothingToShow = buckets.waiting.length === 0 && buckets.inView.length === 0 && buckets.unscheduled.length === 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>{workspace.kind === "run" ? "RUN" : "PROJET"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={() => setFilterSheetOpen(true)}>
            Filtres{hasActiveFilters(filters) ? " •" : ""}
          </button>
          <button type="button" className="btn btn-icon" onClick={onOpenSettings} aria-label="Paramètres de l'espace">
            <IconSettings width={17} height={17} />
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="segmented" role="tablist" aria-label="Vue temporelle">
          <div
            className="segmented-thumb"
            aria-hidden="true"
            style={{ width: "calc(50% - 2px)", left: 2, transform: `translateX(${view === "today" ? "0%" : "100%"})` }}
          />
          <button
            type="button"
            role="tab"
            aria-selected={view === "today"}
            aria-current={view === "today"}
            className="segmented-item"
            onClick={() => setView("today")}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "week"}
            aria-current={view === "week"}
            className="segmented-item"
            onClick={() => setView("week")}
          >
            Cette semaine
          </button>
        </div>

        <QuickFilterChips quickFilterIds={preset.quickFilters} filters={filters} onChange={setFilters} />

        <QuickAddBar
          onQuickAdd={(title) => createAction({ workspaceId: workspace.id, title, itemType: "task", priority: "normal" })}
          onOpenFullForm={(draftTitle) => {
            setAddSheetDraftTitle(draftTitle);
            setAddSheetOpen(true);
          }}
        />

        {nothingToShow ? (
          hasActiveFilters(filters) ? (
            <NoResultsState onClearFilters={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <EmptyState
              title="Rien à afficher"
              description="Ajoutez une action pour commencer à suivre ce RUN."
            />
          )
        ) : (
          <>
            <ActionListSection
              id="section-waiting"
              title="En attente"
              actions={buckets.waiting}
              timezone={timezone}
              statusLabels={statusLabels}
              resolveSyncStatus={resolveSyncStatus}
              onMove={setMovingAction}
              onCycleStatus={(action) => move(workspace.id, action, { axis: "status", status: cycleStatus(action.status) })}
              onComplete={(action) => move(workspace.id, action, { axis: "status", status: "done" })}
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
            />

            <ActionListSection
              id="section-inview"
              title={view === "today" ? "Aujourd'hui" : "Cette semaine"}
              actions={buckets.inView}
              timezone={timezone}
              statusLabels={statusLabels}
              resolveSyncStatus={resolveSyncStatus}
              emptyMessage="Aucune action planifiée."
              onMove={setMovingAction}
              onCycleStatus={(action) => move(workspace.id, action, { axis: "status", status: cycleStatus(action.status) })}
              onComplete={(action) => move(workspace.id, action, { axis: "status", status: "done" })}
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
            />

            <ActionListSection
              id="section-unscheduled"
              title="Sans échéance"
              actions={buckets.unscheduled}
              timezone={timezone}
              statusLabels={statusLabels}
              resolveSyncStatus={resolveSyncStatus}
              onMove={setMovingAction}
              onCycleStatus={(action) => move(workspace.id, action, { axis: "status", status: cycleStatus(action.status) })}
              onComplete={(action) => move(workspace.id, action, { axis: "status", status: "done" })}
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
            />
          </>
        )}
      </div>

      {filterSheetOpen && (
        <FilterSheet
          filters={filters}
          statusLabels={statusLabels}
          onChange={setFilters}
          onClose={() => setFilterSheetOpen(false)}
        />
      )}

      {addSheetOpen && (
        <AddActionSheet
          initialTitle={addSheetDraftTitle}
          onCancel={() => setAddSheetOpen(false)}
          onCreate={({ repeat, ...input }) => {
            if (repeat) {
              createRecurringRule({ workspaceId: workspace.id, ...input, ...repeat });
            } else {
              createAction({ workspaceId: workspace.id, ...input });
            }
            setAddSheetOpen(false);
          }}
        />
      )}

      {movingAction && (
        <MoveActionSheet
          action={movingAction}
          phaseOptions={preset.phaseTemplate ?? []}
          statusLabels={statusLabels}
          timezone={timezone}
          onCancel={() => setMovingAction(null)}
          onConfirm={(destination) => {
            move(workspace.id, movingAction, destination);
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
