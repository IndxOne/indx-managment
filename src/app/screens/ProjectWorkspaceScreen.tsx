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
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { resolveDisplayPhaseId } from "../utils/resolve-phase";
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { ActionListSection } from "../components/ActionListSection";
import { AddActionSheet } from "../components/AddActionSheet";
import { ColumnsView } from "../components/ColumnsView";
import { EditActionSheet } from "../components/EditActionSheet";
import { IconSettings } from "../components/Icons";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { QuickAddBar } from "../components/QuickAddBar";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState, NoResultsState } from "../components/StateBlocks";
import { FilterSheet } from "../components/FilterSheet";
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, type ActionFilters } from "../utils/filter-actions";

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- preset dérive uniquement de kind/approach, pas d'un objet stable
  const phases = useMemo(() => preset.phaseTemplate ?? [], [workspace.kind, workspace.approach]);

  useEffect(() => {
    refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id, allActions.length]);

  // Les approches sans phaseTemplate (ex. "management") n'ont aucune phase à
  // afficher : partir en vue "phase" par défaut serait un cul-de-sac sans
  // aucun moyen d'ajouter une action (cf. bug remonté au changement d'approche).
  const [mode, setMode] = useState<ProjectMode>(phases.length > 0 ? "phase" : "week");
  const [currentPhase, setCurrentPhase] = useState<string | undefined>(phases[0]);
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
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();
  const resolveSyncStatus = useActionSyncStatus();

  const filteredActions = useMemo(() => applyFilters(allActions, filters), [allActions, filters]);

  const actionsByPhase = useMemo(() => {
    const grouped: Record<string, Action[]> = {};
    for (const phase of phases) grouped[phase] = [];
    for (const action of filteredActions) {
      const phase = resolveDisplayPhaseId(action.phaseId, phases);
      if (phase && grouped[phase]) grouped[phase]!.push(action);
    }
    return grouped;
  }, [filteredActions, phases]);

  const weekActions = useMemo(() => {
    if (mode !== "week") return [];
    return filteredActions.filter((action) => {
      const derived = deriveScheduleKeys(action.schedule, timezone);
      return ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
    });
  }, [filteredActions, mode, timezone]);

  // Une action sans échéance (ajout rapide sans détail, ou approche sans
  // phase où rien ne planifie automatiquement) doit rester quelque part
  // sous les yeux — sinon elle disparaît de la vue Semaine sans qu'aucune
  // autre liste ne la montre (finding Codex PR #28).
  const unscheduledActions = useMemo(() => {
    if (mode !== "week") return [];
    return filteredActions.filter((action) => deriveScheduleKeys(action.schedule, timezone).relativeLabel === "unscheduled");
  }, [filteredActions, mode, timezone]);

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>PROJET</span>
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
        {phases.length > 0 && (
          <SegmentedTabs
            ariaLabel="Organisation"
            options={[
              { id: "phase", label: "Par étapes" },
              { id: "week", label: "Par semaine" },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}
        {mode === "phase" ? (
          <ColumnsView
            phases={phases}
            actionsByPhase={actionsByPhase}
            statusLabels={statusLabels}
            timezone={timezone}
            resolveSyncStatus={resolveSyncStatus}
            onAddToPhase={(phaseId, draftTitle) => {
              setCurrentPhase(phaseId);
              setAddSheetDraftTitle(draftTitle ?? "");
              setAddSheetOpen(true);
            }}
            onQuickCreate={(phaseId, title) =>
              createAction({ workspaceId: workspace.id, title, itemType: "task", priority: "normal", phaseId })
            }
            onDropOnPhase={(actionId, phaseId) => {
              const action = allActions.find((candidate) => candidate.id === actionId);
              if (action && action.phaseId !== phaseId) move(workspace.id, action, { axis: "phase", phaseId });
            }}
            onMove={setMovingAction}
            onEdit={setEditingAction}
            onDelete={(action) => remove(workspace.id, action)}
            onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
            onOpenNotes={(action) => setNotesActionId(action.id)}
            onOpenLink={(action) => setLinkingActionId(action.id)}
            onOpenDetail={(action) => setDetailActionId(action.id)}
            members={members}
          />
        ) : (
          <>
            <QuickAddBar
              // Sans phase, l'action ajoutée ici resterait invisible en vue
              // Phases (filtrée par phase) quelle que soit l'onglet choisi —
              // on la rattache donc à la première phase quand il y en a une.
              onQuickAdd={(title) =>
                createAction({ workspaceId: workspace.id, title, itemType: "task", priority: "normal", phaseId: phases[0] })
              }
              onOpenFullForm={(draftTitle) => {
                setAddSheetDraftTitle(draftTitle);
                setAddSheetOpen(true);
              }}
            />
            {weekActions.length === 0 && unscheduledActions.length === 0 ? (
              <section aria-labelledby="section-week">
                <h2 id="section-week" className="section-title">
                  Cette semaine
                </h2>
                {hasActiveFilters(filters) ? (
                  <NoResultsState onClearFilters={() => setFilters(EMPTY_FILTERS)} />
                ) : (
                  <EmptyState title="Rien cette semaine" description="Aucune action planifiée dans les 7 prochains jours." />
                )}
              </section>
            ) : (
              <>
                <ActionListSection
                  id="section-week"
                  title="Cette semaine"
                  actions={weekActions}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onCycleStatus={(action) => move(workspace.id, action, { axis: "status", status: cycleStatus(action.status) })}
                  onComplete={(action) => move(workspace.id, action, { axis: "status", status: "done" })}
                  onEdit={setEditingAction}
                  onDelete={(action) => remove(workspace.id, action)}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                  onOpenNotes={(action) => setNotesActionId(action.id)}
                  onOpenLink={(action) => setLinkingActionId(action.id)}
                  onOpenDetail={(action) => setDetailActionId(action.id)}
                  phaseOptions={phases}
                  resolveSyncStatus={resolveSyncStatus}
                  members={members}
                />
                <ActionListSection
                  id="section-unscheduled"
                  title="Sans échéance"
                  actions={unscheduledActions}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  onMove={setMovingAction}
                  onCycleStatus={(action) => move(workspace.id, action, { axis: "status", status: cycleStatus(action.status) })}
                  onComplete={(action) => move(workspace.id, action, { axis: "status", status: "done" })}
                  onEdit={setEditingAction}
                  onDelete={(action) => remove(workspace.id, action)}
                  onDisableReminder={(action) => disableReminder(workspace.id, action.id)}
                  onOpenNotes={(action) => setNotesActionId(action.id)}
                  onOpenLink={(action) => setLinkingActionId(action.id)}
                  onOpenDetail={(action) => setDetailActionId(action.id)}
                  phaseOptions={phases}
                  resolveSyncStatus={resolveSyncStatus}
                  members={members}
                />
              </>
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
          phaseOptions={phases}
          defaultPhaseId={currentPhase}
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
          phaseOptions={phases}
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
          phaseOptions={phases}
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
