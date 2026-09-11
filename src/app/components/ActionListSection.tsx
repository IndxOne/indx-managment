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
  resolveSyncStatus,
  onOpenWorkspace,
  onMove,
  onCycleStatus,
  onComplete,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
  onOpenDetail,
  phaseOptions,
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
  /** Badge de sync par carte (Lot 3 §2) — calculé par l'écran appelant à partir de `useStore().pendingActionIds`/`conflicts`, pour garder ce composant testable sans StoreProvider. */
  resolveSyncStatus?: (action: Action) => "pending" | "conflict" | undefined;
  /** Fourni avec resolveWorkspace : navigue vers l'espace d'origine depuis le badge. */
  onOpenWorkspace?: (action: Action) => void;
  onMove: (action: Action) => void;
  onCycleStatus: (action: Action) => void;
  /** Swipe à droite sur la carte : passe directement à "Terminé". Omis = swipe de complétion désactivé. */
  onComplete?: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
  onOpenNotes: (action: Action) => void;
  onOpenLink: (action: Action) => void;
  /** Ouvre le détail unifié (Lot 5) au tap/clic sur le titre. Absent = comportement inchangé (écran pas encore migré). */
  onOpenDetail?: (action: Action) => void;
  /** Phases actuelles de l'espace, pour résoudre un phaseId legacy sur le chip de la carte (Lot 6). Fourni uniquement quand la section a un espace unique connu (ex. vue Semaine de ProjectWorkspaceScreen) — absent dans les vues transversales multi-espaces. */
  phaseOptions?: string[];
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
              syncStatus={resolveSyncStatus?.(action)}
              onOpenWorkspace={workspace && onOpenWorkspace ? () => onOpenWorkspace(action) : undefined}
              onMove={() => onMove(action)}
              onCycleStatus={() => onCycleStatus(action)}
              onSwipeComplete={onComplete ? () => onComplete(action) : undefined}
              onEdit={() => onEdit(action)}
              onDelete={() => onDelete(action)}
              onDisableReminder={() => onDisableReminder(action)}
              onOpenNotes={() => onOpenNotes(action)}
              onOpenLink={() => onOpenLink(action)}
              onOpenDetail={onOpenDetail ? () => onOpenDetail(action) : undefined}
              phaseOptions={phaseOptions}
            />
            );
          })}
        </div>
      )}
    </section>
  );
}
