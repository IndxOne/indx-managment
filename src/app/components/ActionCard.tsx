import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { PRIORITY_LABELS } from "../labels";

export function ActionCard({
  action,
  timezone,
  statusLabel,
  onMove,
  onDisableReminder,
}: {
  action: Action;
  timezone: string;
  statusLabel: string;
  onMove: () => void;
  onDisableReminder?: () => void;
}) {
  const derived = deriveScheduleKeys(action.schedule, timezone);
  const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey || derived.isoWeekKey || derived.isoMonthKey;
  const isWaiting = action.status === "waiting";
  const reminderActive = isWaiting && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);

  return (
    <div className="action-row" data-waiting={isWaiting}>
      <div>
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
      <button
        type="button"
        className="btn tap-target"
        onClick={onMove}
        aria-label={`Déplacer "${action.title}"`}
      >
        Déplacer
      </button>
    </div>
  );
}
