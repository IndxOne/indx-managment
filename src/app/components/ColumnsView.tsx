import { useState, type KeyboardEvent } from "react";
import type { Action, ActionStatus } from "../../domain/types";
import { useAnnouncer } from "../a11y/announcer";
import { useInlineCreate } from "../hooks/useInlineCreate";
import { phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { ActionCard } from "./ActionCard";
import { IconMore, IconPlus } from "./Icons";
import { EmptyState } from "./StateBlocks";

/**
 * Vue Colonnes canonique (Lot 3 du renouveau produit) : une seule
 * implémentation du concept "colonnes par phase", utilisée aussi bien sur
 * desktop (colonnes côte à côte, `overflow-x: auto`) que sur mobile (scroll
 * horizontal natif + `scroll-snap`, une colonne principalement visible à la
 * fois) — la bascule entre les deux est purement CSS (`.columns-view`,
 * cf. global.css), aucune branche JS séparée par device. Remplace
 * l'ancien `KanbanBoard` (desktop uniquement) ET l'ancienne vue mobile
 * "par étapes" de `ProjectWorkspaceScreen`, qui dupliquaient chacune leur
 * propre rendu du concept phase.
 *
 * Cartes rendues par `ActionCard` variant="kanban" (Lot 2), y compris sur
 * mobile : ce variant n'active jamais le swipe tactile
 * (terminer/replanifier), ce qui évite tout conflit avec le scroll
 * horizontal natif de la colonne courante — aucune logique de geste
 * personnalisée n'est nécessaire (cf. audit Lot 3 : le swipe reste
 * disponible ailleurs dans l'app via ActionCard variant="list", RUN et
 * vues transversales, inchangées).
 *
 * Création rapide (Lot 4) : le CTA "+ Ajouter une action" se transforme en
 * champ inline au clic (même règle de validation que QuickAddBar, cf.
 * `useInlineCreate` partagé) — Entrée crée directement dans la phase de la
 * colonne, Échap annule, le champ reste ouvert après création pour
 * enchaîner. Le bouton "…" ouvre toujours `AddActionSheet` (formulaire
 * complet) via `onAddToPhase`, inchangé.
 *
 * Aucune logique de persistance, de filtre ou de résolution de statut ici :
 * cette responsabilité reste entièrement à l'écran appelant
 * (`ProjectWorkspaceScreen`), qui fournit `actionsByPhase` déjà regroupé et
 * `resolveSyncStatus` déjà résolu.
 */
export function ColumnsView({
  phases,
  actionsByPhase,
  statusLabels,
  timezone,
  resolveSyncStatus,
  onAddToPhase,
  onQuickCreate,
  onDropOnPhase,
  onMove,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
  onOpenDetail,
}: {
  phases: string[];
  actionsByPhase: Record<string, Action[]>;
  statusLabels: Record<ActionStatus, string>;
  timezone: string;
  /** Badge de sync par carte (parité avec les vues liste) — absent = aucune carte "en attente"/"conflit". */
  resolveSyncStatus?: (action: Action) => "pending" | "conflict" | undefined;
  /** Ouvre le formulaire complet (AddActionSheet) pour la phase donnée — type, priorité, récurrence. `draftTitle` reprend le texte déjà tapé dans le champ inline, comme QuickAddBar. */
  onAddToPhase: (phaseId: string, draftTitle?: string) => void;
  /** Création rapide (titre seul, type "task", priorité normale) directement dans la phase donnée. */
  onQuickCreate: (phaseId: string, title: string) => void;
  onDropOnPhase: (actionId: string, phaseId: string) => void;
  onMove: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (action: Action) => void;
  onDisableReminder: (action: Action) => void;
  onOpenNotes: (action: Action) => void;
  onOpenLink: (action: Action) => void;
  /** Ouvre le détail unifié (Lot 5) au tap/clic sur le titre. Absent = comportement inchangé. */
  onOpenDetail?: (action: Action) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState<string | null>(null);

  if (phases.length === 0) {
    return <EmptyState title="Aucune phase" description="Cette approche métier n'a pas d'étapes à afficher." />;
  }

  return (
    <div className="columns-view">
      {phases.map((phase) => {
        const actions = actionsByPhase[phase] ?? [];
        const columnTitleId = `columns-column-title-${phase}`;
        return (
          <div
            key={phase}
            className={`columns-column ${phaseChipClass(phase)}`}
            role="region"
            aria-labelledby={columnTitleId}
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
              // Le "dragend" de la carte source peut ne jamais bouillonner ici si
              // le déplacement démonte cette carte avant qu'il ne se déclenche
              // (changement de colonne React) : on efface l'état ici aussi, pour
              // qu'un drag externe ultérieur ne réutilise pas un draggingId périmé.
              setDraggingId(null);
            }}
          >
            <div className="columns-column-header">
              <span className="columns-column-title" id={columnTitleId}>
                {phaseLabel(phase)}
              </span>
              <span className="columns-column-count">{actions.length}</span>
            </div>
            <div className="columns-column-cards">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  variant="kanban"
                  action={action}
                  timezone={timezone}
                  statusLabels={statusLabels}
                  syncStatus={resolveSyncStatus?.(action)}
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
                  onOpenDetail={onOpenDetail ? () => onOpenDetail(action) : undefined}
                />
              ))}
            </div>
            {addingPhase === phase ? (
              <ColumnQuickAdd
                phase={phase}
                onCreate={(title) => onQuickCreate(phase, title)}
                onOpenFullForm={(draftTitle) => {
                  setAddingPhase(null);
                  onAddToPhase(phase, draftTitle);
                }}
                onCancel={() => setAddingPhase(null)}
              />
            ) : (
              <button type="button" className="btn btn-block tap-target" onClick={() => setAddingPhase(phase)}>
                + Ajouter une action
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Champ de création inline d'une colonne — mêmes règles que QuickAddBar
 * (`useInlineCreate` partagé) avec en plus le cycle CTA <-> champ propre à
 * la représentation "colonne" (Phase D : deux représentations, une seule
 * logique de validation).
 */
function ColumnQuickAdd({
  phase,
  onCreate,
  onOpenFullForm,
  onCancel,
}: {
  phase: string;
  onCreate: (title: string) => void;
  onOpenFullForm: (draftTitle: string) => void;
  onCancel: () => void;
}) {
  const { announce } = useAnnouncer();
  const { title, setTitle, submit, inputRef } = useInlineCreate((created) => {
    onCreate(created);
    announce(`Action "${created}" créée dans ${phaseLabel(phase)}.`);
  });

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // Garder le champ ouvert et focus pour enchaîner (titre vide -> no-op).
      if (submit()) inputRef.current?.focus();
    }
  }

  return (
    <div className="quick-add columns-column-quickadd">
      <button
        type="button"
        className="quick-add-plus"
        disabled={!title.trim()}
        aria-label="Ajouter"
        onClick={() => {
          if (submit()) inputRef.current?.focus();
        }}
      >
        <IconPlus width={20} height={20} strokeWidth={2.4} />
      </button>
      <input
        ref={inputRef}
        type="text"
        className="quick-add-input"
        placeholder={`Ajouter à « ${phaseLabel(phase)} »…`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- champ révélé par un clic explicite sur le CTA, focus attendu (comme QuickAddBar/AddActionSheet)
        autoFocus
        aria-label={`Nouvelle action dans ${phaseLabel(phase)}`}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => onOpenFullForm(title.trim())}
        aria-label="Options avancées (type, priorité, récurrence)"
        style={{ flexShrink: 0 }}
      >
        <IconMore />
      </button>
    </div>
  );
}
