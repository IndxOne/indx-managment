import { useEffect, useState } from "react";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { getSupabaseClient } from "../adapters/supabase/client";
import { CreateProjectDialog } from "../components/minimal/CreateProjectDialog";
import { AuthRequiredState, ErrorState, LoadingState } from "../components/StateBlocks";
import { authStateKey, useAuthState } from "../hooks/useAuthState";
import { projectsListErrorToUserMessage } from "../utils/projects-list-labels";
import { useCreateProjectAccess } from "../v3-writes/useWriteAccess";
import { createProjectWithObjective } from "../v3-writes/writes";
import type { MinimalProjectCard } from "./build-minimal-projects";
import { MinimalProjectsList } from "./MinimalProjectsList";
import { readMinimalProjects } from "./read-minimal-projects";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "error"; error: PersistenceError }
  | { status: "ready"; projects: MinimalProjectCard[] };

/** Surface principale minimale (étape 1/2) : liste réelle des projets, création, états simples sans données inventées. */
export function MinimalProjectsScreen({
  workspaceIds,
  onOpenProject,
  onOpenAuth,
}: {
  workspaceIds: string[];
  onOpenProject: (projectId: string) => void;
  onOpenAuth: () => void;
}) {
  const auth = useAuthState();
  const authKey = authStateKey(auth);
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const access = useCreateProjectAccess(workspaceIds);

  useEffect(() => {
    if (auth.status === "unconfigured") return setState({ status: "unavailable" });
    if (auth.status === "loading") return setState({ status: "loading" });
    if (auth.status === "unauthenticated") return setState({ status: "unauthenticated" });
    let cancelled = false;
    setState({ status: "loading" });
    void readMinimalProjects(getSupabaseClient()).then((result) => {
      if (cancelled) return;
      if (result.ok) setState({ status: "ready", projects: result.value });
      else {
        console.error("readMinimalProjects a échoué", result.error);
        setState({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, authKey, reload]);

  const canCreate = access.canWrite && !!access.workspaceId && !!access.authUserId;
  const createButton = (
    <button type="button" className="btn btn-primary tap-target" onClick={() => setCreating(true)}>
      + Créer un projet
    </button>
  );

  return (
    <div className="mini-screen">
      <header className="mini-screen-head">
        <div>
          <p className="mini-eyebrow">Vue d&apos;ensemble</p>
          <h1 className="mini-h1">Mes projets</h1>
          <p className="mini-sub">L&apos;essentiel pour avancer, sans tableau de bord à déchiffrer.</p>
        </div>
        {state.status === "ready" && canCreate && state.projects.length > 0 && createButton}
      </header>

      {state.status === "loading" && <LoadingState label="Chargement de tes projets…" />}
      {state.status === "unavailable" && <p className="mini-empty-box">Indisponible pour l&apos;instant.</p>}
      {state.status === "unauthenticated" && (
        <AuthRequiredState description="Connecte-toi pour retrouver tes projets." onOpenAuth={onOpenAuth} />
      )}
      {state.status === "error" && <ErrorState description={projectsListErrorToUserMessage(state.error)} onRetry={() => setReload((n) => n + 1)} />}
      {state.status === "ready" &&
        (state.projects.length === 0 ? (
          <div className="mini-empty-box">
            <strong>Aucun projet</strong>
            <p>{canCreate ? "Créez votre premier projet en quelques secondes." : "Vous n'avez pas encore de projet."}</p>
            {canCreate && createButton}
          </div>
        ) : (
          <MinimalProjectsList projects={state.projects} onOpen={onOpenProject} />
        ))}

      {creating && access.workspaceId && access.authUserId && (
        <CreateProjectDialog
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            const result = await createProjectWithObjective(
              { client: getSupabaseClient() },
              { workspaceId: access.workspaceId!, authUserId: access.authUserId!, name: v.name, objective: v.objective, projectManager: v.projectManager, dueDate: v.dueDate || undefined }
            );
            if (!result.ok) return result.error.message;
            setCreating(false);
            onOpenProject(result.value.projectId);
            return null;
          }}
        />
      )}
    </div>
  );
}
