import { useMemo, useState } from "react";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { useStore } from "../adapters/temporary-store";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { ActionCard } from "../components/ActionCard";
import { AddActionSheet } from "../components/AddActionSheet";
import { MoveActionSheet } from "../components/MoveActionSheet";
import { UndoBanner } from "../components/UndoBanner";
import { EmptyState } from "../components/StateBlocks";

type ProjectMode = "phase" | "week";

export function ProjectWorkspaceScreen({
  workspace,
  timezone,
  onOpenSettings,
}: {
  workspace: Workspace;
  timezone: string;
  onOpenSettings: () => void;
}) {
  const { state, createAction } = useStore();
  const preset = resolveWorkspacePreset(workspace);
  const statusLabels = { ...STATUS_LABELS_DEFAULT, ...preset.statusLabels };
  const allActions = state.actionsByWorkspace[workspace.id] ?? [];
  const phases = preset.phaseTemplate ?? [];

  const [mode, setMode] = useState<ProjectMode>("phase");
  const [currentPhase, setCurrentPhase] = useState<string | undefined>(phases[0]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [movingAction, setMovingAction] = useState<Action | null>(null);

  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo(workspace.id);

  const phaseActions = useMemo(
    () => allActions.filter((action) => action.phaseId === currentPhase),
    [allActions, currentPhase]
  );
  const milestones = phaseActions.filter((action) => action.itemType === "milestone");
  const deliverables = phaseActions.filter((action) => action.itemType !== "milestone");

  const weekActions = useMemo(() => {
    if (mode !== "week") return [];
    return allActions.filter((action) => {
      const derived = deriveScheduleKeys(action.schedule, timezone);
      return ["today", "tomorrow", "this_week"].includes(derived.relativeLabel);
    });
  }, [allActions, mode, timezone]);

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1>{workspace.name}</h1>
          <span className={`badge badge-${workspace.kind}`}>PROJET</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn tap-target"
            onClick={() => setMode(mode === "phase" ? "week" : "phase")}
          >
            {mode === "phase" ? "Vue semaine" : "Vue phases"}
          </button>
          <button type="button" className="btn tap-target" onClick={onOpenSettings} aria-label="Paramètres de l'espace">
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>

      <div className="app-main">
        {mode === "phase" ? (
          <>
            {phases.length === 0 ? (
              <EmptyState
                title="Aucune phase configurée"
                description="Cet espace PROJET fonctionne sans découpage en phases pour l'instant."
              />
            ) : (
              <>
                <div className="segmented" role="tablist" aria-label="Sélecteur de phases">
                  {phases.map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      role="tab"
                      aria-selected={currentPhase === phase}
                      aria-current={currentPhase === phase}
                      className="segmented-item"
                      onClick={() => setCurrentPhase(phase)}
                    >
                      {phase}
                    </button>
                  ))}
                </div>

                <section aria-labelledby="section-milestones">
                  <h2 id="section-milestones" className="section-title">
                    Jalons
                  </h2>
                  {milestones.length === 0 ? (
                    <p className="action-sub">Aucun jalon dans cette phase.</p>
                  ) : (
                    milestones.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        timezone={timezone}
                        statusLabel={statusLabels[action.status]}
                        onMove={() => setMovingAction(action)}
                      />
                    ))
                  )}
                </section>

                <section aria-labelledby="section-deliverables">
                  <h2 id="section-deliverables" className="section-title">
                    Actions et livrables
                  </h2>
                  {deliverables.length === 0 ? (
                    <EmptyState title="Aucune action dans cette phase" description="Ajoutez une action ou un livrable." />
                  ) : (
                    deliverables.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        timezone={timezone}
                        statusLabel={statusLabels[action.status]}
                        onMove={() => setMovingAction(action)}
                      />
                    ))
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          <section aria-labelledby="section-week">
            <h2 id="section-week" className="section-title">
              Cette semaine
            </h2>
            {weekActions.length === 0 ? (
              <EmptyState title="Rien cette semaine" description="Aucune action planifiée dans les 7 prochains jours." />
            ) : (
              weekActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  timezone={timezone}
                  statusLabel={statusLabels[action.status]}
                  onMove={() => setMovingAction(action)}
                />
              ))
            )}
          </section>
        )}
      </div>

      <button type="button" className="btn btn-primary btn-fab" onClick={() => setAddSheetOpen(true)} aria-label="Ajouter une action">
        <span aria-hidden="true">+</span>
      </button>

      {addSheetOpen && (
        <AddActionSheet
          phaseOptions={phases}
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
          phaseOptions={phases}
          statusLabels={statusLabels}
          onCancel={() => setMovingAction(null)}
          onConfirm={(destination) => {
            move(movingAction, destination);
            setMovingAction(null);
          }}
        />
      )}

      {pendingUndo && <UndoBanner message="Déplacement effectué." onUndo={cancelLastMove} />}
    </div>
  );
}
