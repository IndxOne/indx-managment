import { useState } from "react";
import type { Action, ActionStatus } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { scheduleSummary } from "../utils/schedule-summary";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconGripVertical, IconMore } from "./Icons";

/**
 * Carte compacte pour le tableau Kanban desktop (une colonne par phase).
 * Réutilise ActionMenuSheet (même Notes/Lien/Éditer/Déplacer/Supprimer que
 * partout ailleurs) plutôt que de dupliquer la logique du menu.
 */
export function KanbanCard({
  action,
  statusLabels,
  draggable,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
}: {
  action: Action;
  statusLabels: Record<ActionStatus, string>;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const noteCount = action.notes?.length ?? 0;
  const hasLink = Boolean(action.linkedActionId);
  const isDone = action.status === "done";
  const reminderActive = action.status === "waiting" && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);

  return (
    <div className="kanban-card" draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <span className="kanban-card-handle" aria-hidden="true">
        <IconGripVertical width={16} height={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          className="action-title"
          style={isDone ? { textDecoration: "line-through", textDecorationColor: "var(--color-text-tertiary)" } : undefined}
        >
          {action.title}
        </span>
        <div className="kanban-card-chips">
          <span className="status-chip" data-status={action.status}>
            {statusLabels[action.status]}
          </span>
          {action.priority === "high" && (
            <span className="phase-chip phase-chip-red">Prioritaire</span>
          )}
        </div>
        <div className="action-sub">
          {scheduleSummary(action.schedule)}
          {hasLink ? " · Action liée" : ""}
          {noteCount > 0 ? ` · ${noteCount} note${noteCount > 1 ? "s" : ""}` : ""}
        </div>
      </div>
      <button
        type="button"
        className="icon-btn"
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
      {onDisableReminder && reminderActive && (
        <div className="action-sub" style={{ color: "var(--color-warning)", fontWeight: 600 }} role="status">
          {reminderDue ? "Relance due" : "Relance active"}
          <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
            Désactiver
          </button>
        </div>
      )}
    </div>
  );
}
