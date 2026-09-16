import type { Workspace } from "../../domain/workspace";
import { useStore } from "../adapters/temporary-store";
import { EmptyState } from "../components/StateBlocks";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { IconPlus } from "../components/Icons";
import { RunWorkspaceScreen } from "./RunWorkspaceScreen";

/**
 * Point d'entrée du nouvel onglet primaire "RUN" (cadrage renouveau mobile,
 * Lot A) : RUN est une file opérationnelle, pas un projet qu'on choisit dans
 * une liste — dans le cas courant (un seul espace RUN), on saute directement
 * dedans, sans étape de sélection. `WorkspaceListScreen` (Projets) n'est ni
 * modifié ni réutilisé comme écran : seul `WorkspaceCard`, un composant de
 * présentation déjà partagé, l'est ici pour le cas (rare) de plusieurs
 * espaces RUN.
 */
export function RunHubScreen({
  timezone,
  onOpenSettings,
  onNavigateToWorkspace,
  onCreateRun,
}: {
  timezone: string;
  onOpenSettings: (workspaceId: string) => void;
  onNavigateToWorkspace: (workspaceId: string) => void;
  onCreateRun: () => void;
}) {
  const { state } = useStore();
  const runWorkspaces = state.workspaces.filter((workspace): workspace is Workspace => workspace.kind === "run");

  if (runWorkspaces.length === 1) {
    const workspace = runWorkspaces[0]!;
    return (
      <RunWorkspaceScreen
        workspace={workspace}
        timezone={timezone}
        onOpenSettings={() => onOpenSettings(workspace.id)}
        onNavigateToWorkspace={onNavigateToWorkspace}
      />
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>RUN</h1>
      </div>
      <div className="app-main">
        {runWorkspaces.length === 0 ? (
          <EmptyState
            title="Aucun espace RUN pour l'instant"
            description="RUN est votre file opérationnelle continue (incidents, demandes, tâches IT). Créez-en un pour commencer."
            action={
              <button type="button" className="btn btn-primary tap-target" onClick={onCreateRun}>
                <IconPlus width={16} height={16} strokeWidth={2.4} />
                Créer un espace RUN
              </button>
            }
          />
        ) : (
          <ul className="list workspace-card-list" aria-label="Liste des espaces RUN">
            {runWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                actions={state.actionsByWorkspace[workspace.id] ?? []}
                timezone={timezone}
                onSelect={() => onNavigateToWorkspace(workspace.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
