import { useEffect, useState } from "react";
import type { BriefSourceType } from "../../domain/v3/brief/types";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { readProjectOverview } from "../../infrastructure/persistence/v3/repositories/project-overview-reader";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { getSupabaseClient } from "../adapters/supabase/client";
import { authStateKey, useAuthState } from "../hooks/useAuthState";
import { IconChevronRight } from "../components/Icons";
import { AuthRequiredState, ErrorState, LoadingState } from "../components/StateBlocks";
import { SeverityBadge } from "../components/SeverityBadge";
import { ProjectFocusNow } from "../components/project-overview/ProjectFocusNow";
import { ProjectNextUp } from "../components/project-overview/ProjectNextUp";
import { ProjectWatchList } from "../components/project-overview/ProjectWatchList";
import { ProjectExplorer } from "../components/project-overview/ProjectExplorer";
import { criticalityToTone, projectStatusToTone } from "../utils/tone";
import { PROJECT_STATUS_LABELS, CRITICALITY_LABELS, projectOverviewErrorToUserMessage } from "../utils/project-overview-labels";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
  /** Hotfix production (401 V3) : Supabase configuré mais aucune session Auth. */
  | { status: "unauthenticated" }
  | { status: "ready"; overview: ProjectOverviewProjection };

/**
 * Écran Projet V3 (Lot 4, gate validée) — premier écran métier reliant Mon
 * Brief au contexte projet. Affiche exclusivement ce que
 * ProjectOverviewProjection fournit : aucune règle, aucun recalcul, aucun
 * score de santé. `now` produit une seule fois par chargement, au point
 * d'entrée applicatif (même frontière que BriefScreen).
 */
export function ProjectV3Screen({
  projectId,
  focusType,
  focusId,
  onBack,
  onOpenBrief,
  onOpenAuth,
}: {
  projectId: string;
  focusType?: BriefSourceType;
  focusId?: string;
  onBack: () => void;
  onOpenBrief: (projectId: string) => void;
  /** Hotfix production (401 V3) : ouvre l'écran Connexion tant que non
   * authentifié — cet écran est atteignable en deep-link direct (Accueil,
   * Projets V3, Mon Brief), sans garantie qu'une session existe déjà. */
  onOpenAuth: () => void;
}) {
  const auth = useAuthState();
  const authKey = authStateKey(auth);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const focusKey = focusType && focusId ? `${focusType}:${focusId}` : undefined;

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
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    readProjectOverview(client, projectId, now).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", overview: result.value });
      } else {
        console.error("readProjectOverview a échoué", result.error);
        setState({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, authKey, projectId, reloadToken]);

  return (
    <div>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Retour">
            <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h1 className="project-title">{state.status === "ready" ? state.overview.project.name : "Projet"}</h1>
        </div>
      </div>
      {state.status === "ready" && (
        <div className="project-pilot-status-row">
          <SeverityBadge tone={projectStatusToTone(state.overview.project.status)} label={PROJECT_STATUS_LABELS[state.overview.project.status]} />
          <SeverityBadge
            tone={criticalityToTone(state.overview.project.criticality)}
            label={CRITICALITY_LABELS[state.overview.project.criticality]}
          />
        </div>
      )}
      <div className="app-main">
        {state.status === "loading" && <LoadingState label="Chargement du projet…" />}
        {state.status === "error" && (
          <ErrorState description={projectOverviewErrorToUserMessage(state.error)} onRetry={() => setReloadToken((t) => t + 1)} />
        )}
        {state.status === "unauthenticated" && (
          <AuthRequiredState description="Connecte-toi pour voir ce projet." onOpenAuth={onOpenAuth} />
        )}
        {state.status === "ready" && (
          <ProjectPilotShell
            overview={state.overview}
            focusKey={focusKey}
            focusType={focusType}
            focusId={focusId}
            onOpenBrief={() => onOpenBrief(projectId)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Shell Project V3 (UX-5.1 + UX-5.2) — "Maintenant" / "Ensuite" /
 * "À surveiller" / "Explorer" / accès secondaire. Remplace la grille de 6
 * KPI et les 6 sections empilées en permanence de l'ancien écran. Le détail
 * métier complet reste accessible (Explorer, un panneau à la fois — ou Mon
 * Brief), jamais 6 blocs simultanés en permanence.
 */
function ProjectPilotShell({
  overview,
  focusKey,
  focusType,
  focusId,
  onOpenBrief,
}: {
  overview: ProjectOverviewProjection;
  focusKey: string | undefined;
  focusType: BriefSourceType | undefined;
  focusId: string | undefined;
  onOpenBrief: () => void;
}) {
  const { summary, focusItem, watchItems, objectives, milestones, workItems, decisions, risks, issues } = overview;

  // Deep-link (focusType/focusId) : si l'entité ciblée est déjà le focus ou
  // le prochain jalon affichés, on la met en évidence sur place (pas de
  // scroll nécessaire, elle est déjà en tête d'écran). Pour tout autre
  // élément couvert par Mon Brief, voir ProjectExplorer (§7 CLAUDE_TASK.md
  // UX-5.2) : Dependency/ChangeRequest restent hors Explorer, fallback non
  // cassant (aucune erreur, accès Mon Brief toujours disponible).
  const focusItemMatchesDeepLink = !!focusItem && focusKey === focusItem.id;
  const nextMilestoneMatchesDeepLink = !!summary.nextMilestone && focusKey === `milestone:${summary.nextMilestone.id}`;

  return (
    <div className="project-pilot-shell">
      <div className="project-pilot-main">
        <ProjectFocusNow focusItem={focusItem} focused={focusItemMatchesDeepLink} onOpenBrief={onOpenBrief} />
        <ProjectNextUp nextMilestone={summary.nextMilestone} focused={nextMilestoneMatchesDeepLink} onOpenBrief={onOpenBrief} />
      </div>

      <ProjectWatchList watchItems={watchItems} onOpenBrief={onOpenBrief} />

      <ProjectExplorer
        data={{ objectives, milestones, workItems, decisions, risks, issues }}
        focusType={focusType}
        focusId={focusId}
      />

      <div className="project-pilot-secondary">
        <button type="button" className="action-card tap-target" style={{ width: "100%", border: "none", textAlign: "left" }} onClick={onOpenBrief}>
          <div className="action-card-body" style={{ alignItems: "center" }}>
            <span className="card-title" style={{ flex: 1 }}>
              Mon Brief de ce projet
            </span>
            <IconChevronRight className="chevron" width={18} height={18} />
          </div>
        </button>
      </div>
    </div>
  );
}
