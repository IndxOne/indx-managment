import { useEffect, useMemo, useState } from "react";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import type { ProjectsListProjection } from "../../domain/v3/projects-list/types";
import { readProjectsList } from "../../infrastructure/persistence/v3/repositories/projects-list-reader";
import { getSupabaseClient } from "../adapters/supabase/client";
import { authStateKey, useAuthState } from "../hooks/useAuthState";
import { projectsListErrorToUserMessage } from "../utils/projects-list-labels";
import { PROJECTS_LIST_FILTERS, type ProjectsFilterId } from "../utils/projects-list-filters";
import { AuthRequiredState, ErrorState, LoadingState } from "../components/StateBlocks";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { HomeProjectCard } from "../components/home/HomeProjectCard";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
  | { status: "unavailable" }
  /** Hotfix production (401 V3) : Supabase configuré mais aucune session Auth. */
  | { status: "unauthenticated" }
  | { status: "ready"; projection: ProjectsListProjection };

/**
 * Écran Projets V3 (Lot UX-3, gate validée) — vue officielle des Project
 * V3 (décision d'architecture actée : Projets = V3, RUN = Workspace V2
 * kind=run, Workspace V2 kind=project = legacy). Aucun Workspace V2
 * n'apparaît ici : readProjectsList() ne requête que projets_v3_projects,
 * exclusion structurelle, pas un filtre à maintenir.
 */
export function ProjectsV3ListScreen({
  onOpenProject,
  onOpenLegacy,
  onOpenAuth,
}: {
  onOpenProject: (projectId: string) => void;
  onOpenLegacy: () => void;
  /** Hotfix production (401 V3) : ouvre l'écran Connexion tant que non authentifié. */
  onOpenAuth: () => void;
}) {
  const auth = useAuthState();
  const authKey = authStateKey(auth);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [filter, setFilter] = useState<ProjectsFilterId>("active");

  useEffect(() => {
    if (auth.status === "unconfigured") {
      setState({ status: "unavailable" });
      return;
    }
    if (auth.status === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (auth.status === "unauthenticated") {
      setState({ status: "unauthenticated" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    readProjectsList(client, now).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", projection: result.value });
      } else {
        console.error("readProjectsList a échoué", result.error);
        setState({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, authKey, reloadToken]);

  const activeFilterDef = PROJECTS_LIST_FILTERS.find((f) => f.id === filter) ?? PROJECTS_LIST_FILTERS[0]!;
  const filteredProjects = useMemo(
    () => (state.status === "ready" ? activeFilterDef.select(state.projection.projects) : []),
    [state, activeFilterDef]
  );

  return (
    <div>
      <div className="top-bar">
        <h1>Projets</h1>
      </div>
      <div className="app-main">
        <SegmentedTabs
          ariaLabel="Filtrer les projets"
          options={PROJECTS_LIST_FILTERS.map(({ id, label }) => ({ id, label }))}
          value={filter}
          onChange={setFilter}
        />

        {state.status === "loading" && <LoadingState label="Chargement de tes projets…" />}
        {state.status === "error" && (
          <ErrorState description={projectsListErrorToUserMessage(state.error)} onRetry={() => setReloadToken((t) => t + 1)} />
        )}
        {state.status === "unavailable" && <p className="action-sub">Indisponible pour l&apos;instant.</p>}
        {state.status === "unauthenticated" && (
          <AuthRequiredState description="Connecte-toi pour voir tes Project V3." onOpenAuth={onOpenAuth} />
        )}

        {state.status === "ready" &&
          (state.projection.projects.length === 0 ? (
            <p className="action-sub">
              Aucun projet V3 pour le moment. Les anciens espaces restent accessibles séparément ci-dessous.
            </p>
          ) : filteredProjects.length === 0 ? (
            <p className="action-sub">Aucun projet ne correspond à ce filtre.</p>
          ) : (
            <div className="action-card-list">
              {filteredProjects.map((project) => (
                <HomeProjectCard key={project.id} project={project} onOpen={onOpenProject} />
              ))}
            </div>
          ))}

        <button
          type="button"
          className="btn btn-block tap-target"
          style={{ marginTop: "var(--space-4)" }}
          onClick={onOpenLegacy}
        >
          Anciens espaces projet
        </button>
      </div>
    </div>
  );
}
