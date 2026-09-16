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
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { AddActionSheet } from "../components/AddActionSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { FilterSheet } from "../components/FilterSheet";
import { QuickFilterChips } from "../components/QuickFilterChips";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { IconPlus, IconSettings } from "../components/Icons";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { QuickAddBar } from "../components/QuickAddBar";
import { ResolvedRunItem } from "../components/ResolvedRunItem";
import { useToast } from "../components/Toast";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState, NoResultsState } from "../components/StateBlocks";
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, type ActionFilters } from "../utils/filter-actions";
import { resolveAssignees } from "../utils/member-summary";

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
    setAssignees,
  } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = useMemo(() => state.actionsByWorkspace[workspace.id] ?? [], [state.actionsByWorkspace, workspace.id]);
  const isTeam = workspace.collaborationMode === "team";
  const members = isTeam ? state.membersByWorkspace?.[workspace.id] ?? [] : undefined;

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
  const [detailActionId, setDetailActionId] = useState<string | null>(null);
  const detailAction = allActions.find((action) => action.id === detailActionId) ?? null;

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const resolveSyncStatus = useActionSyncStatus();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();
  const { showToast } = useToast();

  const filtered = useMemo(() => applyFilters(allActions, filters), [allActions, filters]);

  // Une opération résolue perd toute sa place dans la file active (cadrage
  // "RUN resolved") : sortie ici, jamais mélangée aux buckets actifs, rendue
  // séparément en fin d'écran via ResolvedRunItem (densité minimale).
  const buckets = useMemo(() => {
    const waiting: Action[] = [];
    const inView: Action[] = [];
    const unscheduled: Action[] = [];
    const resolved: Action[] = [];

    for (const action of filtered) {
      if (action.status === "done") {
        resolved.push(action);
        continue;
      }
      if (action.status === "waiting") {
        waiting.push(action);
        continue;
      }
      const derived = deriveScheduleKeys(action.schedule, timezone);
      if (derived.relativeLabel === "unscheduled") {
        unscheduled.push(action);
        continue;
      }
      const withinView =
        view === "today" ? derived.relativeLabel === "today" : ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
      if (withinView) {
        inView.push(action);
      }
    }
    // Plus récemment résolue en premier — la file "Résolu" reste utile en
    // lecture rapide sans avoir à la trier soi-même.
    resolved.sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
    return { waiting, inView, unscheduled, resolved };
  }, [filtered, timezone, view]);

  const nothingToShow =
    buckets.waiting.length === 0 &&
    buckets.inView.length === 0 &&
    buckets.unscheduled.length === 0 &&
    buckets.resolved.length === 0;

  // `move` déclenche déjà UndoBanner ("Déplacement effectué.", annulable) —
  // un toast en plus ferait doublon visuel sur la même action (cadrage
  // "Feedback"). Le toast reste réservé à la création, qui n'a pas
  // d'équivalent visuel existant sur cet écran.
  function handleTreat(action: Action) {
    move(workspace.id, action, { axis: "status", status: "done" });
  }

  function handleReopen(action: Action) {
    move(workspace.id, action, { axis: "status", status: "todo" });
  }

  function handleQuickAdd(title: string) {
    createAction({ workspaceId: workspace.id, title, itemType: "task", priority: "normal" });
    showToast("Action créée.");
  }

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
        <SegmentedTabs
          ariaLabel="Vue temporelle"
          options={[
            { id: "today", label: "Aujourd'hui" },
            { id: "week", label: "Cette semaine" },
          ]}
          value={view}
          onChange={setView}
        />

        <QuickFilterChips quickFilterIds={preset.quickFilters} filters={filters} onChange={setFilters} />

        <QuickAddBar
          onQuickAdd={handleQuickAdd}
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
              title="Aucune action prévue"
              description="Ajoutez une action pour commencer à suivre ce RUN."
              action={
                <button
                  type="button"
                  className="btn btn-primary tap-target"
                  onClick={() => {
                    setAddSheetDraftTitle("");
                    setAddSheetOpen(true);
                  }}
                >
                  <IconPlus width={16} height={16} strokeWidth={2.4} />
                  Ajouter une action
                </button>
              }
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
              onComplete={handleTreat}
              onTreat={handleTreat}
              showDescription
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
              onOpenDetail={(action) => setDetailActionId(action.id)}
              members={members}
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
              onComplete={handleTreat}
              onTreat={handleTreat}
              showDescription
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
              onOpenDetail={(action) => setDetailActionId(action.id)}
              members={members}
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
              onComplete={handleTreat}
              onTreat={handleTreat}
              showDescription
              onEdit={setEditingAction}
              onDelete={(action) => remove(workspace.id, action)}
              onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
              onOpenNotes={(action) => setNotesActionId(action.id)}
              onOpenLink={(action) => setLinkingActionId(action.id)}
              onOpenDetail={(action) => setDetailActionId(action.id)}
              members={members}
            />

            {buckets.resolved.length > 0 && (
              <section aria-labelledby="section-resolved">
                <h2 id="section-resolved" className="section-title">
                  Résolu
                </h2>
                <ul className="resolved-run-list">
                  {buckets.resolved.map((action) => (
                    <ResolvedRunItem
                      key={action.id}
                      action={action}
                      assignedMember={members ? resolveAssignees(members, action.assigneeIds)[0] : undefined}
                      onOpenDetail={() => setDetailActionId(action.id)}
                      onReopen={() => handleReopen(action)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {filterSheetOpen && (
        <FilterSheet
          filters={filters}
          statusLabels={statusLabels}
          members={members}
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
            showToast("Action créée.");
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

      {detailAction && (
        <ActionDetailSheet
          action={detailAction}
          phaseOptions={preset.phaseTemplate ?? []}
          statusLabels={statusLabels}
          timezone={timezone}
          workspaces={state.workspaces}
          actionsByWorkspace={state.actionsByWorkspace}
          onClose={() => setDetailActionId(null)}
          onEdit={(edit) => editAction(workspace.id, detailAction.id, edit)}
          onMove={(destination) => move(workspace.id, detailAction, destination)}
          onSetReminder={(afterDays) => setReminder(workspace.id, detailAction.id, afterDays)}
          onDisableReminder={() => disableReminder(workspace.id, detailAction.id)}
          onAddNote={(text) => addNote(workspace.id, detailAction.id, text)}
          onLink={(linkedId) => linkAction(workspace.id, detailAction.id, linkedId)}
          onUnlink={() => unlinkAction(workspace.id, detailAction.id)}
          onNavigate={onNavigateToWorkspace}
          onDelete={() => remove(workspace.id, detailAction)}
          collaboration={
            members
              ? {
                  members,
                  assigneeIds: detailAction.assigneeIds,
                  onChangeAssignees: (assigneeIds) => setAssignees(workspace.id, detailAction.id, assigneeIds),
                }
              : undefined
          }
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
