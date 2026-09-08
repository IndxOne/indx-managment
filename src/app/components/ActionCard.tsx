import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import { PRIORITY_LABELS } from "../labels";

export function ActionCard({
  action,
  timezone,
  statusLabel,
  onMove,
}: {
  action: Action;
  timezone: string;
  statusLabel: string;
  onMove: () => void;
}) {
  const derived = deriveScheduleKeys(action.schedule, timezone);
  const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey || derived.isoWeekKey || derived.isoMonthKey;
  const isWaiting = action.status === "waiting";

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
          {isWaiting ? " · En attente" : ""}
        </div>
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
