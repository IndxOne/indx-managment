import { useState } from "react";
import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus, WorkspaceKind } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { KIND_LABELS, phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconLink, IconMessage, IconMore, StatusCheckIcon } from "./Icons";

export function ActionCard({
  action,
  timezone,
  statusLabels,
  /** Renseigné uniquement dans une vue transversale (Aujourd'hui/Semaine) où l'espace n'est pas déjà implicite. */
  workspaceName,
  workspaceKind,
  onMove,
  onCycleStatus,
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
  onMove: () => void;
  /** Cycle rapide 1-clic todo → doing → done (→ todo), sans passer par "Déplacer". */
  onCycleStatus?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const hasChips = Boolean(action.phaseId) || action.priority === "high" || Boolean(workspaceKind);

  return (
    <div className="action-card" style={isDone ? { opacity: 0.72 } : undefined}>
      {hasChips && (
        <div className="action-card-chips">
          {workspaceKind && <span className={`badge badge-${workspaceKind}`}>{KIND_LABELS[workspaceKind]}</span>}
          {action.phaseId && (
            <span className={`phase-chip ${phaseChipClass(action.phaseId)}`}>{phaseLabel(action.phaseId)}</span>
          )}
          {action.priority === "high" && <span className="phase-chip phase-chip-red">Prioritaire</span>}
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
