import { useState } from "react";
import type { Action, ActionStatus, WorkspaceKind } from "../../domain/types";
import { ActionCard } from "./ActionCard";

export function ActionListSection({
  id,
  title,
  actions,
  timezone,
  statusLabels,
  emptyMessage,
  resolveWorkspace,
  resolveStatusLabels,
  onMove,
  onCycleStatus,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
}: {
  id: string;
  title: string;
  actions: Action[];
  timezone: string;
  statusLabels: Record<ActionStatus, string>;
  /** Affichée si la section est vide ; sinon la section entière est masquée (cf. PROJET). */
  emptyMessage?: string;
  /** Fourni uniquement dans les vues transversales (plusieurs espaces mélangés). */
  resolveWorkspace?: (action: Action) => { name: string; kind: WorkspaceKind } | undefined;
  /** Certains préréglages redéfinissent les libellés de statut ; à défaut, `statusLabels`. */
  resolveStatusLabels?: (action: Action) => Record<ActionStatus, string>;
  onMove: (action: Action) => void;
  onCycleStatus: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
  onOpenNotes: (action: Action) => void;
  onOpenLink: (action: Action) => void;
}) {
  const [hideDone, setHideDone] = useState(false);
  const doneCount = actions.filter((action) => action.status === "done").length;
  const visible = hideDone ? actions.filter((action) => action.status !== "done") : actions;

  if (actions.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section aria-labelledby={id}>
        <h2 id={id} className="section-title">
          {title}
        </h2>
        <p className="action-sub">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby={id}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h2 id={id} className="section-title" style={{ margin: 0 }}>
          {title}
        </h2>
        {doneCount > 0 && (
          <button type="button" className="btn tap-target" onClick={() => setHideDone((value) => !value)}>
            {hideDone ? `Afficher terminées (${doneCount})` : `Masquer terminées (${doneCount})`}
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="action-sub">Toutes les actions sont terminées.</p>
      ) : (
        <div className="action-card-list">
          {visible.map((action) => {
            const workspace = resolveWorkspace?.(action);
            return (
            <ActionCard
              key={action.id}
              action={action}
              timezone={timezone}
              statusLabels={resolveStatusLabels?.(action) ?? statusLabels}
              workspaceName={workspace?.name}
              workspaceKind={workspace?.kind}
              onMove={() => onMove(action)}
              onCycleStatus={() => onCycleStatus(action)}
              onEdit={() => onEdit(action)}
              onDelete={() => onDelete(action)}
              onDisableReminder={() => onDisableReminder(action)}
              onOpenNotes={() => onOpenNotes(action)}
              onOpenLink={() => onOpenLink(action)}
            />
            );
          })}
        </div>
      )}
    </section>
  );
}
