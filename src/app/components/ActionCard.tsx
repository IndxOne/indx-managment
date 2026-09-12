import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Member } from "../../domain/member";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus, WorkspaceKind } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { ITEM_TYPE_LABELS, KIND_LABELS, phaseLabel } from "../labels";
import { memberInitials } from "../utils/member-summary";
import { phaseChipClass } from "../utils/phase-color";
import { resolveDisplayPhaseId } from "../utils/resolve-phase";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconCalendar, IconGripVertical, IconLink, IconMessage, IconMore, StatusCheckIcon } from "./Icons";

// Seuil à partir duquel relâcher déclenche l'action ; au-delà, la carte
// arrête de suivre le doigt pour ne pas la faire sortir de son conteneur.
const SWIPE_THRESHOLD = 88;
const SWIPE_MAX = 132;

/**
 * Carte d'action unique (Lot 2 du renouveau produit) : fusionne l'ancienne
 * `ActionCard` (listes mobile/desktop, swipe) et l'ancienne `KanbanCard`
 * (tableau Kanban desktop, drag & drop HTML5) derrière un seul composant.
 * `variant` ne pilote QUE la mise en page et les interactions réellement
 * spécifiques à chaque représentation (swipe vs drag, checkbox vs chip de
 * statut) — la résolution des badges, le menu d'actions et le statut de
 * synchronisation restent une seule logique partagée, jamais dupliquée.
 */
export function ActionCard({
  action,
  timezone,
  statusLabels,
  variant = "list",
  /** Fourni uniquement dans les vues transversales (plusieurs espaces mélangés) ; sans objet en variant "kanban" (toujours mono-espace). */
  workspaceName,
  workspaceKind,
  syncStatus,
  onOpenWorkspace,
  onMove,
  onCycleStatus,
  onSwipeComplete,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
  onOpenDetail,
  /** Drag & drop HTML5 (variant "kanban" uniquement) — ignorés en variant "list". */
  draggable,
  onDragStart,
  onDragEnd,
  phaseOptions,
  assignedMembers,
}: {
  action: Action;
  timezone: string;
  statusLabels: Record<ActionStatus, string>;
  /** "list" (défaut) : cartes listes mobile/desktop, swipe terminer/replanifier. "kanban" : carte compacte du tableau Kanban desktop, drag & drop HTML5. */
  variant?: "list" | "kanban";
  workspaceName?: string;
  workspaceKind?: WorkspaceKind;
  /** "pending" : mutation pas encore confirmée synchronisée. "conflict" : bloquée par une version serveur plus récente (cf. SyncConflict). Absent = synchronisée. */
  syncStatus?: "pending" | "conflict";
  /** Navigue vers l'espace d'origine de l'action ; fourni avec workspaceKind dans les vues transversales. */
  onOpenWorkspace?: () => void;
  onMove: () => void;
  /** Cycle rapide 1-clic todo → doing → done (→ todo), sans passer par "Déplacer". Réservé au variant "list" (le variant "kanban" affiche le statut en chip, changé via drag & drop ou le menu). */
  onCycleStatus?: () => void;
  /** Swipe à droite : passe directement l'action à "Terminé" (équivalent geste de la checkbox/menu). Sans effet en variant "kanban" (jamais de swipe sur desktop, pour ne pas interférer avec le drag & drop natif). */
  onSwipeComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
  /** Ouvre le détail unifié de l'action (Lot 5) au tap/clic sur le titre — jamais sur checkbox/menu/drag/swipe. Absent = comportement inchangé (écran pas encore migré). */
  onOpenDetail?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Phases actuelles de l'espace (variant "list", pour le chip de phase) — résout un phaseId legacy vers son équivalent courant via resolveDisplayPhaseId (Lot 6). Absent = comportement inchangé (phaseId affiché brut, écran multi-espaces sans phases uniques à résoudre). */
  phaseOptions?: string[];
  /** Responsables déjà résolus (Lot 8B) — initiales compactes, max 2 + "+N". Absent ou vide = rien affiché (mode Solo, ou action non assignée). */
  assignedMembers?: Member[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; committed: boolean } | null>(null);
  // Un swipe committed (list) ou un drag HTML5 (kanban) synthétise parfois
  // quand même un "click" natif au relâchement — sans ce garde-fou, ouvrir
  // le détail au clic sur le titre ouvrirait aussi le détail après un
  // simple swipe/déplacement, ce que Phase E interdit explicitement.
  const suppressClickRef = useRef(false);
  const isKanban = variant === "kanban";
  const noteCount = action.notes?.length ?? 0;
  const hasLink = Boolean(action.linkedActionId);
  const derived = deriveScheduleKeys(action.schedule, timezone);
  const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey || derived.isoWeekKey || derived.isoMonthKey;
  const isWaiting = action.status === "waiting";
  const isDone = action.status === "done";
  const reminderActive = isWaiting && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);
  const statusLabel = statusLabels[action.status];
  const nextStatusLabel = statusLabels[cycleStatus(action.status)];
  const ariaChecked = action.status === "done" ? "true" : action.status === "doing" ? "mixed" : "false";
  const hasChips = Boolean(action.phaseId) || action.priority === "high" || Boolean(workspaceKind) || action.itemType !== "task";
  // resolveDisplayPhaseId retombe sur la première phase du template quand
  // phaseId est absent (comportement voulu pour le regroupement en colonnes)
  // — mais ici, "pas de phase" doit rester "pas de chip", jamais la 1ère phase.
  const displayPhaseId = action.phaseId
    ? phaseOptions
      ? resolveDisplayPhaseId(action.phaseId, phaseOptions)
      : action.phaseId
    : undefined;
  // Le variant kanban n'a jamais de swipe : le geste tactile entrerait en
  // conflit avec le drag & drop HTML5 natif (mêmes événements pointeur).
  const swipeCompleteEnabled = !isKanban && Boolean(onSwipeComplete) && !isDone;
  const swipeEnabled = !isKanban && (swipeCompleteEnabled || Boolean(onMove));

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeEnabled || menuOpen) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, committed: false };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.committed) {
      // Zone morte + intention clairement horizontale, pour ne jamais gêner
      // le défilement vertical de la liste ni un simple tap.
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      drag.committed = true;
      suppressClickRef.current = true;
      setIsDragging(true);
      // Absent en environnement de test (jsdom) : optionnel, sans impact
      // fonctionnel puisque la capture ne fait que fiabiliser le suivi du
      // pointeur au-delà des bords de l'élément.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    const max = SWIPE_MAX;
    const clamped = Math.max(-max, Math.min(max, deltaX));
    setDragX(swipeCompleteEnabled ? clamped : Math.min(clamped, 0));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (drag.committed) {
      if (dragX >= SWIPE_THRESHOLD && swipeCompleteEnabled) {
        onSwipeComplete!();
      } else if (dragX <= -SWIPE_THRESHOLD) {
        onMove();
      }
    }
    setDragX(0);
  }

  /**
   * Annulation pure (aucune action déclenchée), pour deux cas où un
   * relâchement "normal" n'a pas eu lieu : pointercancel (interruption
   * système/appli) et sortie de l'élément à la souris avant que le geste
   * ne soit devenu horizontal — donc avant capture du pointeur, si bien
   * qu'aucun pointerup ne sera jamais reçu ici et le drag resterait
   * fantôme pour un futur geste réutilisant le même pointerId.
   */
  function cancelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    setDragX(0);
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.committed) return;
    cancelDrag(event);
  }

  function handleOpenDetailClick() {
    if (suppressClickRef.current) {
      // Le clic qui suit un swipe/drag committed ne doit jamais ouvrir le
      // détail (Phase E) — consommé une seule fois, pas un verrou permanent.
      suppressClickRef.current = false;
      return;
    }
    onOpenDetail?.();
  }

  const menu = menuOpen && (
    <ActionMenuSheet
      action={action}
      noteCount={noteCount}
      hasLink={hasLink}
      onClose={() => setMenuOpen(false)}
      onEdit={onEdit}
      onMove={onMove}
      onDelete={onDelete}
      onOpenNotes={onOpenNotes}
      onOpenLink={onOpenLink}
    />
  );

  const menuButton = (
    <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label={`Actions pour "${action.title}"`}>
      <IconMore />
    </button>
  );

  const title = (
    <span
      className="action-title"
      style={isDone ? { textDecoration: "line-through", textDecorationColor: "var(--color-text-tertiary)" } : undefined}
    >
      {action.title}
    </span>
  );

  const noteAndLinkChips = (
    <>
      {assignedMembers && assignedMembers.length > 0 && (
        <span
          className="meta-chip"
          aria-label={`Responsable${assignedMembers.length > 1 ? "s" : ""} : ${assignedMembers.map((m) => m.displayName).join(", ")}`}
        >
          {assignedMembers
            .slice(0, 2)
            .map((m) => memberInitials(m.displayName))
            .join(" ")}
          {assignedMembers.length > 2 ? ` +${assignedMembers.length - 2}` : ""}
        </span>
      )}
      {noteCount > 0 && (
        <span className="meta-chip">
          <IconMessage width={14} height={14} /> {noteCount}
        </span>
      )}
      {hasLink && (
        <span className="meta-chip">
          <IconLink width={14} height={14} />
        </span>
      )}
      {syncStatus && (
        <span className={`meta-chip sync-chip sync-chip-${syncStatus}`} role="status">
          {syncStatus === "conflict" ? "Conflit" : "En attente"}
        </span>
      )}
    </>
  );

  if (isKanban) {
    const kanbanInfo = (
      <>
        {title}
        <div className="action-card-chips">
          <span className="status-chip" data-status={action.status}>
            {statusLabel}
          </span>
          {action.priority === "high" && <span className="phase-chip phase-chip-red">Prioritaire</span>}
          {action.itemType !== "task" && (
            <span className="phase-chip phase-chip-gray">{ITEM_TYPE_LABELS[action.itemType]}</span>
          )}
        </div>
        <div className="action-sub">
          <span>{scheduleLabel || "Aucune échéance"}</span>
          {noteAndLinkChips}
        </div>
      </>
    );
    return (
      <div
        className="kanban-card"
        draggable={draggable}
        onDragStart={() => {
          suppressClickRef.current = true;
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
      >
        <span className="kanban-card-handle" aria-hidden="true">
          <IconGripVertical width={16} height={16} />
        </span>
        {onOpenDetail ? (
          <button
            type="button"
            className="action-card-open-detail"
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}
            onClick={handleOpenDetailClick}
          >
            {kanbanInfo}
          </button>
        ) : (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>{kanbanInfo}</div>
        )}
        {menuButton}
        {onDisableReminder && reminderActive && (
          <div className="action-sub" style={{ color: "var(--color-warning-text)", fontWeight: 600 }} role="status">
            {reminderDue ? "Relance due" : "Relance active"}
            <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
              Désactiver
            </button>
          </div>
        )}
        {menu}
      </div>
    );
  }

  const listInfo = (
    <>
      {title}
      <div className="action-sub">
        <span>
          {workspaceName ? `${workspaceName} · ` : ""}
          {statusLabel}
          {scheduleLabel ? ` · ${scheduleLabel}` : " · Aucune échéance"}
          {reminderActive && !reminderDue ? ` · Relance après ${action.waitingReminder!.afterDays} j` : ""}
        </span>
        {noteAndLinkChips}
      </div>
    </>
  );

  return (
    <div className="action-card" style={isDone ? { opacity: 0.72 } : undefined}>
      {swipeEnabled && (
        <div className="action-card-swipe-bg" aria-hidden="true">
          {swipeCompleteEnabled && (
            <span className="action-card-swipe-bg-complete">
              <StatusCheckIcon status="done" /> Terminer
            </span>
          )}
          <span className="action-card-swipe-bg-reschedule">
            Replanifier <IconCalendar width={18} height={18} />
          </span>
        </div>
      )}
      <div
        className={`action-card-swipe-content${isDragging ? " is-dragging" : ""}`}
        style={dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        onPointerLeave={handlePointerLeave}
      >
        {hasChips && (
          <div className="action-card-chips">
            {workspaceKind && onOpenWorkspace ? (
              <button type="button" className={`badge badge-${workspaceKind} badge-button`} onClick={onOpenWorkspace}>
                {KIND_LABELS[workspaceKind]}
              </button>
            ) : (
              workspaceKind && <span className={`badge badge-${workspaceKind}`}>{KIND_LABELS[workspaceKind]}</span>
            )}
            {displayPhaseId && (
              <span className={`phase-chip ${phaseChipClass(displayPhaseId)}`}>{phaseLabel(displayPhaseId)}</span>
            )}
            {action.priority === "high" && <span className="phase-chip phase-chip-red">Prioritaire</span>}
            {action.itemType !== "task" && (
              <span className="phase-chip phase-chip-gray">{ITEM_TYPE_LABELS[action.itemType]}</span>
            )}
          </div>
        )}
        <div className="action-card-body">
          {onCycleStatus && (
            <button
              type="button"
              className="status-check"
              role="checkbox"
              aria-checked={ariaChecked}
              aria-label={`Statut de "${action.title}" : ${statusLabel}. Appuyer pour passer à ${nextStatusLabel}.`}
              onClick={onCycleStatus}
            >
              <StatusCheckIcon status={action.status} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {onOpenDetail ? (
              <button type="button" className="action-card-open-detail" onClick={handleOpenDetailClick}>
                {listInfo}
              </button>
            ) : (
              listInfo
            )}
            {reminderDue && (
              <div className="action-sub" style={{ color: "var(--color-warning-text)", fontWeight: 600 }} role="status">
                Relance due
                {onDisableReminder && (
                  <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
                    Désactiver la relance
                  </button>
                )}
              </div>
            )}
          </div>
          {menuButton}
        </div>
      </div>
      {menu}
    </div>
  );
}
