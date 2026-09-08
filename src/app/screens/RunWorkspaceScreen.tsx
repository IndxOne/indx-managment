import { useEffect, useMemo, useState } from "react";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { ActionCard } from "../components/ActionCard";
import { AddActionSheet } from "../components/AddActionSheet";
import { EditActionSheet } from "../components/EditActionSheet";
import { FilterSheet } from "../components/FilterSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState, NoResultsState } from "../components/StateBlocks";
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, type ActionFilters } from "../utils/filter-actions";

type RunView = "today" | "week";

export function RunWorkspaceScreen({
  workspace,
  timezone,
  onOpenSettings,
}: {
  workspace: Workspace;
  timezone: string;
  onOpenSettings: () => void;
}) {
  const { state, createAction, editAction, setReminder, disableReminder, refreshReminders } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = state.actionsByWorkspace[workspace.id] ?? [];

  // Vérifie les relances devenues dues à chaque affichage / changement de
  // la liste (pas d'ordonnanceur en tâche de fond en Lot 3 — cf. Lot 5).
  useEffect(() => {
    refreshReminders(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id, allActions.length]);

  const [view, setView] = useState<RunView>(preset.defaultView === "day" ? "today" : "week");
  const [filters, setFilters] = useState<ActionFilters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [movingAction, setMovingAction] = useState<Action | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo(workspace.id);
  const { pendingUndo: pendingDeleteUndo, remove, cancelLastDelete } = useDeleteWithUndo(workspace.id);

  const filtered = useMemo(() => applyFilters(allActions, filters), [allActions, filters]);

  const buckets = useMemo(() => {
    const waiting: Action[] = [];
    const inView: Action[] = [];
    const unscheduled: Action[] = [];

    for (const action of filtered) {
      if (action.status === "waiting") waiting.push(action);
      const derived = deriveScheduleKeys(action.schedule, timezone);
      if (derived.relativeLabel === "unscheduled") {
        if (action.status !== "waiting") unscheduled.push(action);
        continue;
      }
      const withinView =
        view === "today" ? derived.relativeLabel === "today" : ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
      if (withinView && action.status !== "waiting") {
        inView.push(action);
      }
    }
    return { waiting, inView, unscheduled };
  }, [filtered, timezone, view]);

  const nothingToShow = buckets.waiting.length === 0 && buckets.inView.length === 0 && buckets.unscheduled.length === 0;

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>{workspace.kind === "run" ? "RUN" : "PROJET"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn tap-target" onClick={() => setFilterSheetOpen(true)}>
            Filtres{hasActiveFilters(filters) ? " •" : ""}
          </button>
          <button type="button" className="btn tap-target" onClick={onOpenSettings} aria-label="Paramètres de l'espace">
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="segmented" role="tablist" aria-label="Vue temporelle">
          <button
            type="button"
            role="tab"
            aria-selected={view === "today"}
            aria-current={view === "today"}
            className="segmented-item"
            onClick={() => setView("today")}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "week"}
            aria-current={view === "week"}
            className="segmented-item"
            onClick={() => setView("week")}
          >
            Cette semaine
          </button>
        </div>

        {nothingToShow ? (
          hasActiveFilters(filters) ? (
            <NoResultsState onClearFilters={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <EmptyState
              title="Rien à afficher"
              description="Ajoutez une action pour commencer à suivre ce RUN."
            />
          )
        ) : (
          <>
            {buckets.waiting.length > 0 && (
              <section aria-labelledby="section-waiting">
                <h2 id="section-waiting" className="section-title">
                  En attente
                </h2>
                {buckets.waiting.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    timezone={timezone}
                    statusLabel={statusLabels[action.status]}
                    onMove={() => setMovingAction(action)}
                    onEdit={() => setEditingAction(action)}
                    onDelete={() => remove(action)}
                    onDisableReminder={() => disableReminder(workspace.id, action.id)}
                  />
                ))}
              </section>
            )}

            <section aria-labelledby="section-inview">
              <h2 id="section-inview" className="section-title">
                {view === "today" ? "Aujourd'hui" : "Cette semaine"}
              </h2>
              {buckets.inView.length === 0 ? (
                <p className="action-sub">Aucune action planifiée.</p>
              ) : (
                buckets.inView.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    timezone={timezone}
                    statusLabel={statusLabels[action.status]}
                    onMove={() => setMovingAction(action)}
                    onEdit={() => setEditingAction(action)}
                    onDelete={() => remove(action)}
                    onDisableReminder={() => disableReminder(workspace.id, action.id)}
                  />
                ))
              )}
            </section>

            {buckets.unscheduled.length > 0 && (
              <section aria-labelledby="section-unscheduled">
                <h2 id="section-unscheduled" className="section-title">
                  Sans échéance
                </h2>
                {buckets.unscheduled.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    timezone={timezone}
                    statusLabel={statusLabels[action.status]}
                    onMove={() => setMovingAction(action)}
                    onEdit={() => setEditingAction(action)}
                    onDelete={() => remove(action)}
                    onDisableReminder={() => disableReminder(workspace.id, action.id)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      <button type="button" className="btn btn-primary btn-fab" onClick={() => setAddSheetOpen(true)} aria-label="Ajouter une action">
        <span aria-hidden="true">+</span>
      </button>

      {filterSheetOpen && (
        <FilterSheet
          filters={filters}
          statusLabels={statusLabels}
          onChange={setFilters}
          onClose={() => setFilterSheetOpen(false)}
        />
      )}

      {addSheetOpen && (
        <AddActionSheet
          onCancel={() => setAddSheetOpen(false)}
          onCreate={(input) => {
            createAction({ workspaceId: workspace.id, ...input });
            setAddSheetOpen(false);
          }}
        />
      )}

      {movingAction && (
        <MoveActionSheet
          action={movingAction}
          phaseOptions={preset.phaseTemplate ?? []}
          statusLabels={statusLabels}
          onCancel={() => setMovingAction(null)}
          onConfirm={(destination) => {
            move(movingAction, destination);
            setMovingAction(null);
          }}
          onSetReminder={(afterDays) => setReminder(workspace.id, movingAction.id, afterDays)}
        />
      )}

      {editingAction && (
        <EditActionSheet
          action={editingAction}
          onCancel={() => setEditingAction(null)}
          onSave={(edit) => {
            editAction(workspace.id, editingAction.id, edit);
            setEditingAction(null);
          }}
        />
      )}

      {pendingUndo && <UndoBanner message="Déplacement effectué." onUndo={cancelLastMove} />}
      {pendingDeleteUndo && (
        <UndoBanner
          message="Action supprimée."
          onUndo={cancelLastDelete}
          style={pendingUndo ? { bottom: "calc(var(--bottom-nav-height) + 72px)" } : undefined}
        />
      )}
    </div>
  );
}
