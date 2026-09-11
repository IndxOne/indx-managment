import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus, WorkspaceKind } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { ITEM_TYPE_LABELS, KIND_LABELS, phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconCalendar, IconLink, IconMessage, IconMore, StatusCheckIcon } from "./Icons";

// Seuil à partir duquel relâcher déclenche l'action ; au-delà, la carte
// arrête de suivre le doigt pour ne pas la faire sortir de son conteneur.
const SWIPE_THRESHOLD = 88;
const SWIPE_MAX = 132;

export function ActionCard({
  action,
  timezone,
  statusLabels,
  /** Fourni uniquement dans les vues transversales (plusieurs espaces mélangés). */
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
}: {
  action: Action;
  timezone: string;
  statusLabels: Record<ActionStatus, string>;
  workspaceName?: string;
  workspaceKind?: WorkspaceKind;
  /** "pending" : mutation pas encore confirmée synchronisée. "conflict" : bloquée par une version serveur plus récente (cf. SyncConflict). Absent = synchronisée. */
  syncStatus?: "pending" | "conflict";
  /** Navigue vers l'espace d'origine de l'action ; fourni avec workspaceKind dans les vues transversales. */
  onOpenWorkspace?: () => void;
  onMove: () => void;
  /** Cycle rapide 1-clic todo → doing → done (→ todo), sans passer par "Déplacer". */
  onCycleStatus?: () => void;
  /** Swipe à droite : passe directement l'action à "Terminé" (équivalent geste de la checkbox/menu). */
  onSwipeComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; committed: boolean } | null>(null);
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
  const swipeCompleteEnabled = Boolean(onSwipeComplete) && !isDone;
  const swipeEnabled = swipeCompleteEnabled || Boolean(onMove);

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
            {action.phaseId && (
              <span className={`phase-chip ${phaseChipClass(action.phaseId)}`}>{phaseLabel(action.phaseId)}</span>
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
            <span
              className="action-title"
              style={isDone ? { textDecoration: "line-through", textDecorationColor: "var(--color-text-tertiary)" } : undefined}
            >
              {action.title}
            </span>
            <div className="action-sub">
              <span>
                {workspaceName ? `${workspaceName} · ` : ""}
                {statusLabel}
                {scheduleLabel ? ` · ${scheduleLabel}` : " · Aucune échéance"}
                {reminderActive && !reminderDue ? ` · Relance après ${action.waitingReminder!.afterDays} j` : ""}
              </span>
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
            </div>
            {reminderDue && (
              <div className="action-sub" style={{ color: "var(--color-warning)", fontWeight: 600 }} role="status">
                Relance due
                {onDisableReminder && (
                  <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
                    Désactiver la relance
                  </button>
                )}
              </div>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label={`Actions pour "${action.title}"`}>
            <IconMore />
          </button>
        </div>
      </div>
      {menuOpen && (
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
      )}
    </div>
  );
}
