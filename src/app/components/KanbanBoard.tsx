import { useState } from "react";
import type { Action, ActionStatus } from "../../domain/types";
import { phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { KanbanCard } from "./KanbanCard";

/**
 * Vue desktop d'un espace PROJET : une colonne par phase, glisser-déposer
 * une carte entre colonnes pour changer sa phase (raccourci du menu
 * "..." → "Déplacer" → "Phase", qui reste le chemin accessible/clavier).
 */
export function KanbanBoard({
  phases,
  actionsByPhase,
  statusLabels,
  onAddToPhase,
  onDropOnPhase,
  onMove,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
}: {
  phases: string[];
  actionsByPhase: Record<string, Action[]>;
  statusLabels: Record<ActionStatus, string>;
  onAddToPhase: (phaseId: string) => void;
  onDropOnPhase: (actionId: string, phaseId: string) => void;
  onMove: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
  onOpenNotes: (action: Action) => void;
  onOpenLink: (action: Action) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);

  return (
    <div className="kanban-board">
      {phases.map((phase) => {
        const actions = actionsByPhase[phase] ?? [];
        return (
          <div
            key={phase}
            className={`kanban-column ${phaseChipClass(phase)}`}
            data-drag-over={dragOverPhase === phase ? "true" : undefined}
            onDragOver={(event) => {
              if (!draggingId) return;
              event.preventDefault();
              setDragOverPhase(phase);
            }}
            onDragLeave={() => setDragOverPhase((current) => (current === phase ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setDragOverPhase(null);
              if (draggingId) onDropOnPhase(draggingId, phase);
            }}
          >
            <div className="kanban-column-header">
              <span className="kanban-column-title">{phaseLabel(phase)}</span>
              <span className="kanban-column-count">{actions.length}</span>
            </div>
            <div className="kanban-column-cards">
              {actions.map((action) => (
                <KanbanCard
                  key={action.id}
                  action={action}
                  statusLabels={statusLabels}
                  draggable
                  onDragStart={() => setDraggingId(action.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverPhase(null);
                  }}
                  onMove={() => onMove(action)}
                  onEdit={() => onEdit(action)}
                  onDelete={() => onDelete(action)}
                  onDisableReminder={() => onDisableReminder(action)}
                  onOpenNotes={() => onOpenNotes(action)}
                  onOpenLink={() => onOpenLink(action)}
                />
              ))}
            </div>
            <button type="button" className="btn btn-block tap-target" onClick={() => onAddToPhase(phase)}>
              + Ajouter une action
            </button>
          </div>
        );
      })}
    </div>
  );
}
