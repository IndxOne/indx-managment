import type { Workspace } from "../../domain/workspace";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { EmptyState } from "../components/StateBlocks";
import { IconPlus } from "../components/Icons";
import { useStore } from "../adapters/temporary-store";

export function WorkspaceListScreen({
  timezone,
  onSelect,
  onCreate,
  kindFilter,
}: {
  timezone: string;
  onSelect: (workspace: Workspace) => void;
  onCreate: () => void;
  /** Filtre la liste sur un genre d'espace (ex. onglet "RUN" de la barre basse, v2.2) — reste la même vue/liste, pas un nouvel écran. Absent = tous les espaces (comportement inchangé). */
  kindFilter?: Workspace["kind"];
}) {
  const { state } = useStore();
  const workspaces = kindFilter ? state.workspaces.filter((workspace) => workspace.kind === kindFilter) : state.workspaces;
  const isRunFilter = kindFilter === "run";

  return (
    <div>
      <div className="top-bar" style={{ flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1>{isRunFilter ? "Mes espaces RUN" : "Mes projets"}</h1>
          <p className="action-sub" style={{ marginTop: 2 }}>
            {isRunFilter ? "Le travail continu que tu suis au quotidien." : "Un espace pour chaque projet ou activité."}
          </p>
        </div>
        {workspaces.length > 0 && (
          <button
            type="button"
            className="btn btn-primary tap-target"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={onCreate}
          >
            <IconPlus width={16} height={16} strokeWidth={2.4} />
            {isRunFilter ? "Nouvel espace RUN" : "Nouveau projet"}
          </button>
        )}
      </div>
      <div className="app-main">
        {workspaces.length === 0 ? (
          <EmptyState
            title={isRunFilter ? "Aucun espace RUN pour l'instant" : "Aucun espace pour l'instant"}
            description={
              isRunFilter
                ? "Crée ton premier espace RUN pour suivre ton travail continu."
                : "Créez votre premier espace RUN ou PROJET pour commencer."
            }
            action={
              <button type="button" className="btn btn-primary tap-target" onClick={onCreate}>
                {isRunFilter ? "Créer un espace RUN" : "Créer un espace"}
              </button>
            }
          />
        ) : (
          <ul className="list workspace-card-list" aria-label="Liste des espaces">
            {workspaces.map((workspace) => (
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
