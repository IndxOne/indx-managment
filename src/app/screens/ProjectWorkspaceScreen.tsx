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
import { ActionListSection } from "../components/ActionListSection";
import { AddActionSheet } from "../components/AddActionSheet";
import { ColumnsView } from "../components/ColumnsView";
import { EditActionSheet } from "../components/EditActionSheet";
import { IconSettings } from "../components/Icons";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { QuickAddBar } from "../components/QuickAddBar";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState } from "../components/StateBlocks";

type ProjectMode = "phase" | "week";

// Les anciennes phases AMOA restent affichées dans la colonne équivalente
// après le passage du tableau de six à quatre colonnes. Les données ne sont
// jamais réécrites lors d'un changement de préréglage.
const LEGACY_PHASE_COLUMNS: Record<string, string> = {
  ateliers: "conception",
  realisations: "realisation",
  validations: "deploiement",
  restitutions: "deploiement",
  cloture: "deploiement",
};

function resolveActionColumn(action: Action, phases: string[]): string | undefined {
  if (!action.phaseId) return phases[0];
  if (phases.includes(action.phaseId)) return action.phaseId;
  return LEGACY_PHASE_COLUMNS[action.phaseId] ?? phases[0];
}

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
  } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = useMemo(() => state.actionsByWorkspace[workspace.id] ?? [], [state.actionsByWorkspace, workspace.id]);
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
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetDraftTitle, setAddSheetDraftTitle] = useState("");
  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const notesAction = allActions.find((action) => action.id === notesActionId) ?? null;
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);
  const linkingAction = allActions.find((action) => action.id === linkingActionId) ?? null;

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();
  const resolveSyncStatus = useActionSyncStatus();

  const actionsByPhase = useMemo(() => {
    const grouped: Record<string, Action[]> = {};
    for (const phase of phases) grouped[phase] = [];
    for (const action of allActions) {
      const phase = resolveActionColumn(action, phases);
      if (phase && grouped[phase]) grouped[phase]!.push(action);
    }
    return grouped;
  }, [allActions, phases]);

  const weekActions = useMemo(() => {
    if (mode !== "week") return [];
    return allActions.filter((action) => {
      const derived = deriveScheduleKeys(action.schedule, timezone);
      return ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
    });
  }, [allActions, mode, timezone]);

  // Une action sans échéance (ajout rapide sans détail, ou approche sans
  // phase où rien ne planifie automatiquement) doit rester quelque part
  // sous les yeux — sinon elle disparaît de la vue Semaine sans qu'aucune
  // autre liste ne la montre (finding Codex PR #28).
  const unscheduledActions = useMemo(() => {
    if (mode !== "week") return [];
    return allActions.filter((action) => deriveScheduleKeys(action.schedule, timezone).relativeLabel === "unscheduled");
  }, [allActions, mode, timezone]);

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>PROJET</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-icon" onClick={onOpenSettings} aria-label="Paramètres de l'espace">
            <IconSettings width={17} height={17} />
          </button>
        </div>
      </div>

      <div className="app-main">
        {phases.length > 0 && (
          <div className="segmented" role="tablist" aria-label="Organisation">
            <div
              className="segmented-thumb"
              aria-hidden="true"
              style={{ width: "calc(50% - 2px)", left: 2, transform: `translateX(${mode === "phase" ? "0%" : "100%"})` }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={mode === "phase"}
              aria-current={mode === "phase"}
              className="segmented-item"
              onClick={() => setMode("phase")}
            >
              Par étapes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "week"}
              aria-current={mode === "week"}
              className="segmented-item"
              onClick={() => setMode("week")}
            >
              Par semaine
            </button>
          </div>
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
                <EmptyState title="Rien cette semaine" description="Aucune action planifiée dans les 7 prochains jours." />
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
                  resolveSyncStatus={resolveSyncStatus}
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
                  resolveSyncStatus={resolveSyncStatus}
                />
              </>
            )}
          </>
        )}
      </div>

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
