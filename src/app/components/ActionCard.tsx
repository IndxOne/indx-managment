import { useState } from "react";
import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconLink, IconMessage, IconMore } from "./Icons";

export function ActionCard({
  action,
  timezone,
  statusLabels,
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
  const reminderActive = isWaiting && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);
  const statusLabel = statusLabels[action.status];
  const nextStatusLabel = statusLabels[cycleStatus(action.status)];
  const ariaChecked = action.status === "done" ? "true" : action.status === "doing" ? "mixed" : "false";

  return (
    <div className="action-row" data-waiting={isWaiting}>
      <div className="action-row-content">
        {onCycleStatus && (
          <button
            type="button"
            className="status-check tap-target"
            data-status={action.status}
            role="checkbox"
            aria-checked={ariaChecked}
            aria-label={`Statut de "${action.title}" : ${statusLabel}. Appuyer pour passer à ${nextStatusLabel}.`}
            onClick={onCycleStatus}
          />
        )}
        <span
          className="priority-dot"
          data-priority={action.priority}
          aria-hidden="true"
          style={{ display: "inline-block", marginRight: 8 }}
        />
        <span className="action-title">{action.title}</span>
        <div className="action-sub">
          <span>
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
              <button type="button" className="btn tap-target" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
                Désactiver la relance
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn icon-btn tap-target"
        onClick={() => setMenuOpen(true)}
        aria-label={`Actions pour "${action.title}"`}
      >
        <IconMore />
      </button>
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
