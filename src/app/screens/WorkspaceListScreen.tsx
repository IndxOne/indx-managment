import { useState } from "react";
import type { Workspace } from "../../domain/workspace";
import { WorkspaceCard } from "../components/WorkspaceCard";
import { WorkspaceFilterSheet } from "../components/WorkspaceFilterSheet";
import { EmptyState } from "../components/StateBlocks";
import { IconPlus } from "../components/Icons";
import { useStore } from "../adapters/temporary-store";
import { applyWorkspaceFilters, EMPTY_WORKSPACE_FILTERS, hasActiveWorkspaceFilters } from "../utils/filter-workspaces";

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
  const [filters, setFilters] = useState(EMPTY_WORKSPACE_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Cet écran est le contenu de l'onglet "Projets" de la navigation
  // (routeToTab renvoie "spaces" uniquement pour un espace kind==="project" —
  // les espaces RUN vivent dans leur propre onglet/écran, RunHubScreen, déjà
  // filtré sur kind==="run"). Filtre sur la propriété métier réelle
  // (`workspace.kind`), jamais sur le nom/titre (QA post-prod 2026-09-17 :
  // un espace RUN apparaissait ici faute de ce filtre).
  const projectWorkspaces = state.workspaces.filter((workspace) => workspace.kind === "project");
  const filtered = applyWorkspaceFilters(projectWorkspaces, state.actionsByWorkspace, filters);

  return (
    <div>
      <div className="top-bar" style={{ flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1>Mes projets</h1>
          <p className="action-sub" style={{ marginTop: 2 }}>
            Un espace pour chaque projet ou activité.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {projectWorkspaces.length > 0 && (
            <button type="button" className="btn tap-target" onClick={() => setFilterSheetOpen(true)}>
              Filtres{hasActiveWorkspaceFilters(filters) ? " •" : ""}
            </button>
          )}
          {projectWorkspaces.length > 0 && (
            <button
              type="button"
              className="btn btn-primary tap-target"
              style={{ whiteSpace: "nowrap" }}
              onClick={onCreate}
            >
              <IconPlus width={16} height={16} strokeWidth={2.4} />
              Nouveau projet
            </button>
          )}
        </div>
      </div>
      <div className="app-main">
        {projectWorkspaces.length === 0 ? (
          <EmptyState
            title="Aucun projet pour l'instant"
            description="Créez votre premier espace PROJET pour commencer."
            action={
              <button type="button" className="btn btn-primary tap-target" onClick={onCreate}>
                Créer un projet
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucun projet ne correspond aux filtres"
            description="Essayez d'élargir votre sélection."
            action={
              <button type="button" className="btn tap-target" onClick={() => setFilters(EMPTY_WORKSPACE_FILTERS)}>
                Réinitialiser les filtres
              </button>
            }
          />
        ) : (
          <ul className="list workspace-card-list" aria-label="Liste des espaces">
            {filtered.map((workspace) => (
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
      {filterSheetOpen && (
        <WorkspaceFilterSheet filters={filters} onChange={setFilters} onClose={() => setFilterSheetOpen(false)} />
      )}
    </div>
  );
}
