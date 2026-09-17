import { useEffect, useMemo, useState } from "react";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { deriveTodayOverview } from "../utils/today-overview";
import { resolveAssignees } from "../utils/member-summary";
import { ActionCard } from "../components/ActionCard";
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { EmptyState } from "../components/StateBlocks";
import { TodaySection } from "../components/TodaySection";
import { IconCalendar, IconPlus } from "../components/Icons";
import { UndoBanner } from "../components/UndoBanner";

/**
 * Accueil (renouveau produit, Lot A) : écran d'EXÉCUTION, pas un dashboard.
 * Répond à "qu'est-ce que je dois faire maintenant ?" avec 5 blocs, dans cet
 * ordre — Priorité immédiate, RUN du jour, Tâches Projet du jour, Échéances,
 * Projets actifs — tous dérivés de `deriveTodayOverview` (construit sur le
 * même moteur temporel que RUN/Semaine, `deriveHomeBuckets` +
 * `deriveScheduleKeys` : aucun second moteur, aucun chiffre inventé).
 *
 * Aucune création rapide propre à cet écran (l'ambiguïté "dans quel espace
 * créer ?" reste réelle sur une vue qui agrège plusieurs espaces) — l'état
 * vide s'appuie sur `onQuickCreate`, le même point d'entrée global que le
 * bouton central de la barre basse (résolution d'espace par défaut faite
 * une seule fois, dans AppShell).
 */
export function HomeScreen({
  timezone,
  onNavigateToWorkspace,
  onOpenWeek,
  onQuickCreate,
}: {
  timezone: string;
  onNavigateToWorkspace: (workspaceId: string) => void;
  onOpenWeek: () => void;
  /** Ouvre la création rapide globale (bouton central de la barre basse) — utilisé par l'état vide pour proposer une action suivante concrète. */
  onQuickCreate: () => void;
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

  const overview = useMemo(
    () => deriveTodayOverview(state.workspaces, state.actionsByWorkspace, timezone),
    [state.workspaces, state.actionsByWorkspace, timezone]
  );

  function presetFor(workspaceId: string) {
    const workspace = state.workspaces.find((candidate) => candidate.id === workspaceId);
    return workspace ? resolveWorkspacePreset(workspace) : undefined;
  }

  function workspaceOf(action: Action) {
    return state.workspaces.find((candidate) => candidate.id === action.workspaceId);
  }

  function resolveStatusLabels(action: Action) {
    return { ...STATUS_LABELS_DEFAULT, ...presetFor(action.workspaceId)?.statusLabels };
  }

  function membersFor(action: Action) {
    const workspace = workspaceOf(action);
    if (!workspace || workspace.collaborationMode !== "team") return undefined;
    return state.membersByWorkspace?.[workspace.id];
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

  function handleTreat(action: Action) {
    // `move` déclenche déjà UndoBanner ("Déplacement effectué.", annulable) —
    // un toast en plus ferait doublon sur la même action (cadrage
    // "Feedback" : une action importante mérite un retour, pas deux qui se
    // chevauchent visuellement). Le toast reste réservé à la création, sans
    // équivalent visuel existant sur cet écran.
    move(action.workspaceId, action, { axis: "status", status: "done" as const });
  }

  function renderCard(action: Action, options?: { showDescription?: boolean; treat?: boolean }) {
    const workspace = workspaceOf(action);
    const members = membersFor(action);
    return (
      <ActionCard
        key={action.id}
        action={action}
        timezone={timezone}
        statusLabels={resolveStatusLabels(action)}
        workspaceName={workspace?.name}
        workspaceKind={workspace?.kind}
        syncStatus={resolveSyncStatus(action)}
        onOpenWorkspace={() => onNavigateToWorkspace(action.workspaceId)}
        onMove={() => setMovingAction(action)}
        onCycleStatus={() => move(action.workspaceId, action, { axis: "status", status: cycleStatus(action.status) })}
        onSwipeComplete={() => handleTreat(action)}
        onTreat={options?.treat ? () => handleTreat(action) : undefined}
        onEdit={() => setEditingAction(action)}
        onDelete={() => remove(action.workspaceId, action)}
        onDisableReminder={() => disableReminder(action.workspaceId, action.id)}
        onOpenNotes={() => setNotesActionId(action.id)}
        onOpenLink={() => setLinkingActionId(action.id)}
        onOpenDetail={() => setDetailActionId(action.id)}
        showDescription={options?.showDescription}
        assignedMembers={members ? resolveAssignees(members, action.assigneeIds) : undefined}
      />
    );
  }

  const nothingToShow =
    !overview.priorityAction &&
    overview.runToday.length === 0 &&
    overview.projectTasksToday.length === 0 &&
    !overview.nextDeadline &&
    overview.activeProjects.length === 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <span className="screen-eyebrow">INDXONE Workspace</span>
          <h1>Aujourd&apos;hui</h1>
        </div>
      </div>
      <div className="app-main">
        {nothingToShow ? (
          <EmptyState
            title="Aucune action prévue aujourd'hui"
            description="Rien d'urgent pour l'instant."
            action={
              <button type="button" className="btn btn-primary tap-target" onClick={onQuickCreate}>
                <IconPlus width={16} height={16} strokeWidth={2.4} />
                Ajouter une action
              </button>
            }
          />
        ) : (
          <>
            {/* En paysage mobile (844×390 et similaires), ce conteneur bascule en
                deux colonnes CSS — gauche "focus/urgence" (Priorité, Échéances,
                Projets actifs), droite "actions du jour" (RUN, Tâches Projet) —
                cf. règle `.today-sections-grid` dans global.css. En portrait et
                sur desktop, transparent : l'ordre et l'empilement DOM ci-dessous
                restent la seule mise en page. */}
            <div className="today-sections-grid">
              <TodaySection
                id="section-home-priority"
                title="Priorité immédiate"
                isEmpty={!overview.priorityAction}
                emptyMessage="Rien d'urgent à traiter en premier."
                landscapeGroup="focus"
              >
                {overview.priorityAction && (
                  <div
                    className={`action-card-list home-priority-card home-priority-card-${overview.priorityAction.priority}`}
                  >
                    {renderCard(overview.priorityAction, { showDescription: true, treat: true })}
                  </div>
                )}
              </TodaySection>

              <TodaySection
                id="section-home-run"
                title="RUN du jour"
                isEmpty={overview.runToday.length === 0}
                emptyMessage="Aucune action RUN à traiter aujourd'hui."
                landscapeGroup="actions"
              >
                <div className="action-card-list home-run-today">
                  {overview.runToday.map((action) => renderCard(action, { treat: true }))}
                </div>
              </TodaySection>

              <TodaySection
                id="section-home-project-tasks"
                title="Tâches Projet du jour"
                isEmpty={overview.projectTasksToday.length === 0}
                emptyMessage="Aucune tâche Projet prévue aujourd'hui."
                landscapeGroup="actions"
              >
                <div className="action-card-list home-project-tasks-today">
                  {overview.projectTasksToday.map((action) => renderCard(action, { treat: true }))}
                </div>
              </TodaySection>

              <TodaySection
                id="section-home-deadline"
                title="Échéances"
                isEmpty={!overview.nextDeadline}
                emptyMessage="Aucune échéance proche cette semaine."
                landscapeGroup="focus"
              >
                {overview.nextDeadline && (
                  <div className="action-card-list home-deadline-compact">
                    <div className="home-deadline-header">
                      <span className="home-deadline-icon" aria-hidden="true">
                        <IconCalendar width={16} height={16} strokeWidth={2} />
                      </span>
                      <span className="home-deadline-label">Prochaine échéance</span>
                    </div>
                    {renderCard(overview.nextDeadline)}
                  </div>
                )}
              </TodaySection>

              <TodaySection
                id="section-home-active-projects"
                title="Projets actifs"
                isEmpty={overview.activeProjects.length === 0}
                emptyMessage="Aucun projet actif pour l'instant."
                landscapeGroup="focus"
              >
                <ul className="active-projects-list" aria-label="Projets actifs">
                  {overview.activeProjects.map(({ workspace, totalCount, doneCount }) => {
                    const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
                    return (
                      <li key={workspace.id}>
                        <button
                          type="button"
                          className="active-project-row"
                          onClick={() => onNavigateToWorkspace(workspace.id)}
                        >
                          <span className="active-project-name">{workspace.name}</span>
                          <span className="progress-track" aria-hidden="true">
                            <span className="progress-fill" style={{ width: `${percent}%` }} />
                          </span>
                          <span className="active-project-percent">{percent}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </TodaySection>
            </div>

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
