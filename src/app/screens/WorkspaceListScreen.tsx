import type { Workspace } from "../../domain/workspace";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { EmptyState } from "../components/StateBlocks";
import { IconPlus } from "../components/Icons";
import { useStore } from "../adapters/temporary-store";

export function WorkspaceListScreen({
  timezone,
  onSelect,
  onCreate,
}: {
  timezone: string;
  onSelect: (workspace: Workspace) => void;
  onCreate: () => void;
}) {
  const { state } = useStore();

  return (
    <div>
      <div className="top-bar" style={{ flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1>Mes projets</h1>
          <p className="action-sub" style={{ marginTop: 2 }}>
            Un espace pour chaque projet ou activité.
          </p>
        </div>
        {state.workspaces.length > 0 && (
          <button
            type="button"
            className="btn btn-primary tap-target"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={onCreate}
          >
            <IconPlus width={16} height={16} strokeWidth={2.4} />
            Nouveau projet
          </button>
        )}
      </div>
      <div className="app-main">
        {state.workspaces.length === 0 ? (
          <EmptyState
            title="Aucun espace pour l'instant"
            description="Créez votre premier espace RUN ou PROJET pour commencer."
            action={
              <button type="button" className="btn btn-primary tap-target" onClick={onCreate}>
                Créer un espace
              </button>
            }
          />
        ) : (
          <ul className="list workspace-card-list" aria-label="Liste des espaces">
            {state.workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                actions={state.actionsByWorkspace[workspace.id] ?? []}
                timezone={timezone}
                onSelect={() => onSelect(workspace)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
