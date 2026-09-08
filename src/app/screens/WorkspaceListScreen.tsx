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
      <div className="top-bar">
        <h1>Espaces</h1>
        {state.workspaces.length > 0 && (
          <button type="button" className="btn btn-icon" onClick={onCreate} aria-label="Créer un espace">
            <IconPlus width={18} height={18} strokeWidth={2} />
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
          <ul className="list ios-group" aria-label="Liste des espaces">
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
