import { useEffect, useRef, useState } from "react";
import type { BriefSourceType } from "../../domain/v3/brief/types";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { readProjectOverview } from "../../infrastructure/persistence/v3/repositories/project-overview-reader";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { getSupabaseClient } from "../adapters/supabase/client";
import { IconChevronRight } from "../components/Icons";
import { ErrorState, LoadingState } from "../components/StateBlocks";
import { ProjectSummaryGrid } from "../components/project-overview/ProjectSummaryGrid";
import { ObjectiveCard } from "../components/project-overview/ObjectiveCard";
import { AttentionEntityCard } from "../components/project-overview/AttentionEntityCard";
import { ProjectOverviewSection } from "../components/project-overview/ProjectOverviewSection";
import { PROJECT_STATUS_LABELS, CRITICALITY_LABELS, projectOverviewErrorToUserMessage } from "../utils/project-overview-labels";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
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
}: {
  projectId: string;
  focusType?: BriefSourceType;
  focusId?: string;
  onBack: () => void;
  onOpenBrief: (projectId: string) => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const focusRef = useRef<HTMLDivElement | null>(null);
  const focusKey = focusType && focusId ? `${focusType}:${focusId}` : undefined;

  useEffect(() => {
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
  }, [projectId, reloadToken]);

  // Scroll vers l'élément focus s'il est présent — vérification de
  // présence de scrollIntoView plutôt qu'un try/catch comme contrôle de
  // flux (correctif de gate §6). Aucun modal, aucune erreur si absent.
  useEffect(() => {
    if (state.status !== "ready" || !focusKey) return;
    const el = focusRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center" });
    }
  }, [state.status, focusKey]);

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
      <div className="app-main">
        {state.status === "loading" && <LoadingState label="Chargement du projet…" />}
        {state.status === "error" && (
          <ErrorState description={projectOverviewErrorToUserMessage(state.error)} onRetry={() => setReloadToken((t) => t + 1)} />
        )}
        {state.status === "ready" && (
          <ProjectOverviewContent overview={state.overview} focusKey={focusKey} focusRef={focusRef} onOpenBrief={() => onOpenBrief(projectId)} />
        )}
      </div>
    </div>
  );
}

function ProjectOverviewContent({
  overview,
  focusKey,
  focusRef,
  onOpenBrief,
}: {
  overview: ProjectOverviewProjection;
  focusKey: string | undefined;
  focusRef: React.MutableRefObject<HTMLDivElement | null>;
  onOpenBrief: () => void;
}) {
  const { project, objectives, milestones, workItems, decisions, risks, issues, summary } = overview;

  function refFor(sourceType: BriefSourceType, id: string) {
    if (focusKey !== `${sourceType}:${id}`) return undefined;
    return (el: HTMLDivElement | null) => {
      focusRef.current = el;
    };
  }
  function focusedFor(sourceType: BriefSourceType, id: string) {
    return focusKey === `${sourceType}:${id}`;
  }

  return (
    <>
      <div className="brief-item-card-header">
        <span className="meta-chip">{PROJECT_STATUS_LABELS[project.status]}</span>
        <span className="meta-chip">{CRITICALITY_LABELS[project.criticality]}</span>
      </div>

      <ProjectSummaryGrid summary={summary} />

      <button type="button" className="action-card tap-target" style={{ width: "100%", border: "none", textAlign: "left" }} onClick={onOpenBrief}>
        <div className="action-card-body" style={{ alignItems: "center" }}>
          <span className="card-title" style={{ flex: 1 }}>
            Mon Brief de ce projet
          </span>
          <IconChevronRight className="chevron" width={18} height={18} />
        </div>
      </button>

      <ProjectOverviewSection title="Objectifs" items={objectives} renderItem={(o) => <ObjectiveCard objective={o} />} />

      <ProjectOverviewSection
        title="Jalons"
        items={milestones}
        renderItem={(m) => (
          <AttentionEntityCard
            ref={refFor("milestone", m.id)}
            focused={focusedFor("milestone", m.id)}
            title={m.observableResult}
            statusLabel={m.status}
            dueDate={m.targetDate}
            needsAttention={m.needsAttention}
            reason={m.reason}
          />
        )}
      />

      <ProjectOverviewSection
        title="WorkItems"
        items={workItems}
        renderItem={(w) => (
          <AttentionEntityCard
            ref={refFor("work_item", w.id)}
            focused={focusedFor("work_item", w.id)}
            title={w.title}
            statusLabel={w.status}
            dueDate={w.dueDate}
            needsAttention={w.needsAttention}
            reason={w.reason}
          />
        )}
      />

      <ProjectOverviewSection
        title="Décisions"
        items={decisions}
        renderItem={(d) => (
          <AttentionEntityCard
            ref={refFor("decision", d.id)}
            focused={focusedFor("decision", d.id)}
            title={d.question}
            statusLabel={d.status}
            dueDate={d.dueDate}
            needsAttention={d.needsAttention}
            reason={d.reason}
          />
        )}
      />

      <ProjectOverviewSection
        title="Risques"
        items={risks}
        renderItem={(r) => (
          <AttentionEntityCard
            ref={refFor("risk", r.id)}
            focused={focusedFor("risk", r.id)}
            title={r.event}
            statusLabel={r.status}
            needsAttention={r.needsAttention}
            reason={r.reason}
            extra={r.criticality ? CRITICALITY_LABELS[r.criticality] : undefined}
          />
        )}
      />

      <ProjectOverviewSection
        title="Issues"
        items={issues}
        renderItem={(i) => (
          <AttentionEntityCard
            ref={refFor("issue", i.id)}
            focused={focusedFor("issue", i.id)}
            title={i.problem}
            statusLabel={i.status}
            dueDate={i.targetDate}
            needsAttention={i.needsAttention}
            reason={i.reason}
          />
        )}
      />
    </>
  );
}
