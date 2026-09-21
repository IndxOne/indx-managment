import { useEffect, useState } from "react";
import type { BriefItem } from "../../domain/v3/brief/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { listBriefProjects, type BriefProjectSummary } from "../../infrastructure/persistence/v3/repositories/brief-projects";
import { getSupabaseClient } from "../adapters/supabase/client";
import { useAuthState } from "../hooks/useAuthState";
import { IconChevronRight } from "../components/Icons";
import { AuthRequiredState, EmptyState, ErrorState, LoadingState } from "../components/StateBlocks";
import { BriefScreen } from "./BriefScreen";

type LauncherState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
  /** Hotfix production (401 V3) : Supabase configuré mais aucune session Auth. */
  | { status: "unauthenticated" }
  | { status: "ready"; projects: BriefProjectSummary[] };

function LauncherFrame({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Retour">
            <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h1 className="project-title">Mon Brief</h1>
        </div>
      </div>
      <div className="app-main">{children}</div>
    </div>
  );
}

/**
 * Point d'entrée de Mon Brief (correctif de gate) — un mécanisme d'entrée
 * uniquement, jamais un écran de gestion de projets (pas de création,
 * édition, suppression, recherche, favoris). 0 projet -> EmptyState ; 1
 * projet -> BriefScreen ouvert directement, sans étape inutile ; plusieurs
 * -> liste tactile minimale. Ne modifie aucun composant Brief déjà validé,
 * se contente de les entourer.
 */
export function BriefLauncherScreen({
  onBack,
  onOpenItem,
  onOpenAuth,
}: {
  onBack: () => void;
  onOpenItem?: (item: BriefItem) => void;
  /** Hotfix production (401 V3) : ouvre l'écran Connexion tant que non authentifié. */
  onOpenAuth: () => void;
}) {
  const auth = useAuthState();
  const [state, setState] = useState<LauncherState>({ status: "loading" });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
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
    setSelectedProjectId(null);
    const client = getSupabaseClient();
    listBriefProjects(client).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", projects: result.value });
      } else {
        console.error("listBriefProjects a échoué", result.error);
        setState({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, reloadToken]);

  if (state.status === "loading") {
    return (
      <LauncherFrame onBack={onBack}>
        <LoadingState label="Chargement des projets…" />
      </LauncherFrame>
    );
  }

  if (state.status === "error") {
    return (
      <LauncherFrame onBack={onBack}>
        <ErrorState description="Impossible de charger la liste des projets." onRetry={() => setReloadToken((token) => token + 1)} />
      </LauncherFrame>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <LauncherFrame onBack={onBack}>
        <AuthRequiredState description="Connecte-toi pour voir Mon Brief." onOpenAuth={onOpenAuth} />
      </LauncherFrame>
    );
  }

  const { projects } = state;

  // 0 projet : ce n'est pas une erreur technique (§2 du correctif de gate).
  if (projects.length === 0) {
    return (
      <LauncherFrame onBack={onBack}>
        <EmptyState title="Aucun projet disponible pour le moment." />
      </LauncherFrame>
    );
  }

  // 1 projet : ouverture directe, aucune étape de sélection inutile.
  if (projects.length === 1) {
    const only = projects[0]!;
    return <BriefScreen projectId={only.id} projectName={only.name} onBack={onBack} onOpenItem={onOpenItem} onOpenAuth={onOpenAuth} />;
  }

  const selected = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : undefined;
  if (selected) {
    // Retour depuis le Brief d'un projet choisi : vers le sélecteur, pas
    // directement hors de Mon Brief (cohérent avec l'origine de la navigation).
    return <BriefScreen projectId={selected.id} projectName={selected.name} onBack={() => setSelectedProjectId(null)} onOpenItem={onOpenItem} onOpenAuth={onOpenAuth} />;
  }

  // Plusieurs projets : liste tactile minimale, réutilise le patron déjà
  // en place dans MoreScreen (mêmes classes CSS, aucune nouvelle règle).
  return (
    <div>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Retour">
            <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h1 className="project-title">Choisir un projet</h1>
        </div>
      </div>
      <div className="app-main">
        <ul className="list action-card-list">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className="action-card tap-target"
                style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="action-card-body" style={{ alignItems: "center" }}>
                  <span className="card-title" style={{ flex: 1 }}>
                    {project.name}
                  </span>
                  <IconChevronRight className="chevron" width={18} height={18} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
