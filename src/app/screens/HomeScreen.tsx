import { useCallback, useEffect, useMemo, useState } from "react";
import { cycleStatus } from "../../domain/move-action";
import type { Action } from "../../domain/types";
import type { BriefItem } from "../../domain/v3/brief/types";
import type { HomeOverviewProjection } from "../../domain/v3/home/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { readHomeOverview } from "../../infrastructure/persistence/v3/repositories/home-overview-reader";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { getSupabaseClient } from "../adapters/supabase/client";
import { useStore } from "../adapters/temporary-store";
import { useActionSyncStatus } from "../hooks/useActionSyncStatus";
import { authStateKey, useAuthState } from "../hooks/useAuthState";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { homeOverviewErrorToUserMessage } from "../utils/home-overview-labels";
import { deriveTodayOverview } from "../utils/today-overview";
import { resolveAssignees } from "../utils/member-summary";
import { ActionCard } from "../components/ActionCard";
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { LinkActionSheet } from "../components/LinkActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { NotesSheet } from "../components/NotesSheet";
import { AuthRequiredState, ErrorState, LoadingState } from "../components/StateBlocks";
import { TodaySection } from "../components/TodaySection";
import { BriefItemCard } from "../components/brief/BriefItemCard";
import { HomeProjectCard } from "../components/home/HomeProjectCard";
import { IconFlag, IconPlus } from "../components/Icons";
import { UndoBanner } from "../components/UndoBanner";

type V3LoadState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
  | { status: "ready"; overview: HomeOverviewProjection }
  /** Supabase non configuré (ex. TemporaryStoreProvider) : Mon Brief/Mes
   * projets sont indisponibles sans que ce soit une erreur réseau — même
   * contrainte que readHomeOverview()/getSupabaseClient() ailleurs dans
   * l'app (BriefScreen, ProjectV3Screen). RUN reste fonctionnel (§7 gate). */
  | { status: "unavailable" }
  /** Hotfix production (401 V3) : Supabase configuré mais aucune session
   * Auth — jamais une requête `projets_v3_*` dans cet état, jamais une
   * ErrorState (l'absence de session est un état attendu, pas une panne). */
  | { status: "unauthenticated" };

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function attentionSummary(items: BriefItem[]): string {
  if (items.length === 0) return "Rien ne nécessite ton attention actuellement.";
  if (items.length === 1) return "1 élément nécessite ton attention.";
  return `${items.length} éléments nécessitent ton attention.`;
}

/**
 * Accueil V3 (Lot UX-2, gate validée) — cockpit, pas un dashboard. Deux
 * sources de données strictement séparées, avec des états de chargement
 * indépendants (§7/§9 de la gate) : Mon Brief + Mes projets viennent de
 * readHomeOverview() (V3, projets_v3_*, jamais un Workspace V2) ; RUN vient
 * du store déjà chargé côté client (V2, zéro requête supplémentaire),
 * restreint aux espaces kind==="run" — un Project V2 n'apparaît donc jamais
 * ici (deriveTodayOverview() réutilisé tel quel, seulement sur un
 * sous-ensemble RUN des espaces).
 */
export function HomeScreen({
  timezone,
  onNavigateToWorkspace,
  onOpenWeek,
  onOpenBrief,
  onOpenProject,
  onQuickCreate,
  onOpenAuth,
}: {
  timezone: string;
  onNavigateToWorkspace: (workspaceId: string) => void;
  onOpenWeek: () => void;
  onOpenBrief: () => void;
  onOpenProject: (projectId: string, focus?: { focusType: BriefItem["sourceType"]; focusId: string }) => void;
  /** Ouvre la création rapide globale (bouton central de la barre basse) — utilisé par l'état vide RUN. */
  onQuickCreate: () => void;
  /** Hotfix production (401 V3) : ouvre l'écran Connexion depuis les blocs V3 tant que non authentifié. */
  onOpenAuth: () => void;
}) {
  const { state, editAction, setReminder, disableReminder, refreshReminders, addNote, linkAction, unlinkAction } =
    useStore();

  const auth = useAuthState();
  const authKey = authStateKey(auth);
  const [v3State, setV3State] = useState<V3LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (auth.status === "unconfigured") {
      setV3State({ status: "unavailable" });
      return;
    }
    if (auth.status === "loading") {
      setV3State({ status: "loading" });
      return;
    }
    if (auth.status === "unauthenticated") {
      setV3State({ status: "unauthenticated" });
      return;
    }
    let cancelled = false;
    setV3State({ status: "loading" });
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    readHomeOverview(client, now).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setV3State({ status: "ready", overview: result.value });
      } else {
        console.error("readHomeOverview a échoué", result.error);
        setV3State({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, authKey, reloadToken]);

  const runWorkspaces = useMemo(() => state.workspaces.filter((workspace) => workspace.kind === "run"), [state.workspaces]);

  useEffect(() => {
    for (const workspace of runWorkspaces) refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runWorkspaces.length]);

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo();
  const resolveSyncStatus = useActionSyncStatus();

  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [notesActionId, setNotesActionId] = useState<string | null>(null);
  const [linkingActionId, setLinkingActionId] = useState<string | null>(null);
  const [detailActionId, setDetailActionId] = useState<string | null>(null);

  const runOverview = useMemo(
    () => deriveTodayOverview(runWorkspaces, state.actionsByWorkspace, timezone),
    [runWorkspaces, state.actionsByWorkspace, timezone]
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
    for (const workspace of runWorkspaces) {
      const found = (state.actionsByWorkspace[workspace.id] ?? []).find((candidate) => candidate.id === actionId);
      if (found) return found;
    }
    return undefined;
  }

  const notesAction = notesActionId ? findAction(notesActionId) ?? null : null;
  const linkingAction = linkingActionId ? findAction(linkingActionId) ?? null : null;
  const detailAction = detailActionId ? findAction(detailActionId) ?? null : null;

  function handleTreat(action: Action) {
    move(action.workspaceId, action, { axis: "status", status: "done" as const });
  }

  function renderRunCard(action: Action) {
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
        onTreat={() => handleTreat(action)}
        onEdit={() => setEditingAction(action)}
        onDelete={() => remove(action.workspaceId, action)}
        onDisableReminder={() => disableReminder(action.workspaceId, action.id)}
        onOpenNotes={() => setNotesActionId(action.id)}
        onOpenLink={() => setLinkingActionId(action.id)}
        onOpenDetail={() => setDetailActionId(action.id)}
        assignedMembers={members ? resolveAssignees(members, action.assigneeIds) : undefined}
      />
    );
  }

  const handleOpenAttentionItem = useCallback(
    (item: BriefItem) => onOpenProject(item.projectId, { focusType: item.sourceType, focusId: item.sourceId }),
    [onOpenProject]
  );

  const runIsEmpty = !runOverview.priorityAction && runOverview.runToday.length === 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <span className="screen-eyebrow">INDXONE Workspace</span>
          <h1>Aujourd&apos;hui</h1>
        </div>
      </div>
      <div className="app-main">
        <section aria-labelledby="home-attention-heading" className="today-section">
          <h2 id="home-attention-heading" className="section-title">
            Aujourd&apos;hui
          </h2>
          {v3State.status === "loading" && <LoadingState label="Chargement de ce qui nécessite ton attention…" />}
          {v3State.status === "error" && (
            <ErrorState description={homeOverviewErrorToUserMessage(v3State.error)} onRetry={() => setReloadToken((t) => t + 1)} />
          )}
          {v3State.status === "unavailable" && <p className="action-sub">Indisponible pour l&apos;instant.</p>}
          {v3State.status === "unauthenticated" && (
            <AuthRequiredState description="Connecte-toi pour voir ce qui nécessite ton attention." onOpenAuth={onOpenAuth} />
          )}
          {v3State.status === "ready" && (
            <>
              <p className="action-sub">{attentionSummary(v3State.overview.attentionItems)}</p>
              {v3State.overview.attentionItems.length > 0 && (
                <div className="action-card-list">
                  {v3State.overview.attentionItems.map((item) => (
                    <BriefItemCard key={item.id} item={item} onOpen={handleOpenAttentionItem} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="home-projects-heading" className="today-section">
          <h2 id="home-projects-heading" className="section-title">
            Mes projets
          </h2>
          {v3State.status === "loading" && <LoadingState label="Chargement de tes projets…" />}
          {v3State.status === "error" && (
            <ErrorState description={homeOverviewErrorToUserMessage(v3State.error)} onRetry={() => setReloadToken((t) => t + 1)} />
          )}
          {v3State.status === "unavailable" && <p className="action-sub">Indisponible pour l&apos;instant.</p>}
          {v3State.status === "unauthenticated" && (
            <AuthRequiredState description="Connecte-toi pour voir tes projets." onOpenAuth={onOpenAuth} />
          )}
          {v3State.status === "ready" &&
            (v3State.overview.projects.length === 0 ? (
              <p className="action-sub">Aucun projet actif pour l&apos;instant.</p>
            ) : (
              <div className="action-card-list">
                {v3State.overview.projects.map((project) => (
                  <HomeProjectCard key={project.id} project={project} onOpen={onOpenProject} />
                ))}
              </div>
            ))}
        </section>

        <section aria-labelledby="home-brief-heading" className="today-section">
          <h2 id="home-brief-heading" className="section-title">
            Mon Brief
          </h2>
          <button
            type="button"
            className="action-card tap-target"
            style={{ width: "100%", border: "none", textAlign: "left" }}
            onClick={v3State.status === "unauthenticated" ? onOpenAuth : onOpenBrief}
          >
            <div className="action-card-body" style={{ alignItems: "center" }}>
              <span className="more-icon" aria-hidden="true">
                <IconFlag width={20} height={20} />
              </span>
              <span className="card-title" style={{ flex: 1 }}>
                {v3State.status === "unauthenticated" ? "Se connecter pour voir Mon Brief" : "Voir Mon Brief"}
                {v3State.status === "ready" && (
                  <span className="action-sub" style={{ display: "block" }}>
                    Mis à jour à {formatUpdatedAt(v3State.overview.generatedAt)}
                  </span>
                )}
              </span>
            </div>
          </button>
        </section>

        <TodaySection
          id="home-run-heading"
          title="RUN"
          isEmpty={runIsEmpty}
          emptyMessage="Rien à traiter côté RUN pour l'instant."
          emptyAction={
            <button type="button" className="btn tap-target" onClick={onQuickCreate}>
              <IconPlus width={16} height={16} strokeWidth={2.4} />
              Ajouter une action
            </button>
          }
        >
          <div className="action-card-list">
            {runOverview.priorityAction && renderRunCard(runOverview.priorityAction)}
            {runOverview.runToday.map((action) => renderRunCard(action))}
          </div>
        </TodaySection>

        <button type="button" className="btn btn-block tap-target" style={{ marginBottom: "var(--space-4)" }} onClick={onOpenWeek}>
          Voir la semaine complète
        </button>
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
