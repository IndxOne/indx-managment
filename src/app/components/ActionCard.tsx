import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { PRIORITY_LABELS } from "../labels";

export function ActionCard({
  action,
  timezone,
  statusLabel,
  onMove,
  onEdit,
  onDelete,
  onDisableReminder,
}: {
  action: Action;
  timezone: string;
  statusLabel: string;
  onMove: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
}) {
  const derived = deriveScheduleKeys(action.schedule, timezone);
  const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey || derived.isoWeekKey || derived.isoMonthKey;
  const isWaiting = action.status === "waiting";
  const reminderActive = isWaiting && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);

  return (
    <div className="action-row" data-waiting={isWaiting}>
      <div className="action-row-content">
        <span
          className="priority-dot"
          data-priority={action.priority}
          aria-hidden="true"
          style={{ display: "inline-block", marginRight: 8 }}
        />
        <span className="action-title">{action.title}</span>
        <div className="action-sub">
          {statusLabel}
          {scheduleLabel ? ` · ${scheduleLabel}` : " · Aucune échéance"}
          {reminderActive && !reminderDue ? ` · Relance après ${action.waitingReminder!.afterDays} j` : ""}
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
      <div className="action-row-buttons">
        {onEdit && (
          <button
            type="button"
            className="btn icon-btn tap-target"
            onClick={onEdit}
            aria-label={`Éditer "${action.title}"`}
          >
            <span aria-hidden="true">✏️</span>
          </button>
        )}
        <button
          type="button"
          className="btn tap-target"
          onClick={onMove}
          aria-label={`Déplacer "${action.title}"`}
        >
          Déplacer
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn icon-btn tap-target"
            onClick={onDelete}
            aria-label={`Supprimer "${action.title}"`}
          >
            <span aria-hidden="true">🗑</span>
          </button>
        )}
      </div>
    </div>
  );
}
