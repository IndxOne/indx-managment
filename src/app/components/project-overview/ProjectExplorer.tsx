import { useRef, useState, useEffect } from "react";
import type {
  DecisionOverviewItem,
  IssueOverviewItem,
  MilestoneOverviewItem,
  ObjectiveOverviewItem,
  RecentChangeSourceType,
  RiskOverviewItem,
  WorkItemOverviewItem,
} from "../../../domain/v3/project-overview/types";
import { ObjectiveCard } from "./ObjectiveCard";
import { AttentionEntityCard } from "./AttentionEntityCard";
import { CRITICALITY_LABELS } from "../../utils/project-overview-labels";

type CategoryId = "objectives" | "milestones" | "workItems" | "decisions" | "risks" | "issues";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  objectives: "Objectifs",
  milestones: "Jalons",
  workItems: "Actions",
  decisions: "Décisions",
  risks: "Risques",
  issues: "Issues",
};

const CATEGORY_ORDER: CategoryId[] = ["objectives", "milestones", "workItems", "decisions", "risks", "issues"];

/** Deep-link (focusType/focusId) : les 5 types couverts par Mon Brief, plus
 * "objective" (UX-5.3, "Changé récemment" peut cibler un Objectif — Mon
 * Brief ne le couvre jamais). Dependency/ChangeRequest restent hors
 * Explorer (§4 CLAUDE_TASK.md UX-5.2) — fallback non cassant, simplement
 * aucune catégorie n'est présélectionnée pour eux. */
function categoryForSourceType(sourceType: RecentChangeSourceType | undefined): CategoryId | undefined {
  switch (sourceType) {
    case "objective":
      return "objectives";
    case "milestone":
      return "milestones";
    case "work_item":
      return "workItems";
    case "decision":
      return "decisions";
    case "risk":
      return "risks";
    case "issue":
      return "issues";
    default:
      return undefined;
  }
}

interface ExplorerData {
  objectives: ObjectiveOverviewItem[];
  milestones: MilestoneOverviewItem[];
  workItems: WorkItemOverviewItem[];
  decisions: DecisionOverviewItem[];
  risks: RiskOverviewItem[];
  issues: IssueOverviewItem[];
}

/**
 * Zone "Explorer" (UX-5.2) — remplace les 6 sections permanentes de
 * l'ancien écran par un sélecteur de catégories compact (chips + compteur)
 * et **un seul panneau de détail à la fois**, jamais 6 blocs simultanés.
 * Réutilise les composants de détail déjà en place depuis UX-4/5.1
 * (`AttentionEntityCard`/`ObjectiveCard`, jamais recréés) sur des données
 * déjà chargées par `readProjectOverview()` — aucune nouvelle requête.
 */
export function ProjectExplorer({
  data,
  focusType,
  focusId,
  alreadyVisibleElsewhere,
}: {
  data: ExplorerData;
  focusType?: RecentChangeSourceType;
  focusId?: string;
  /** Correctif review Codex (P2, PR #68) : la cible du deep-link est déjà
   * visible/mise en évidence dans "Maintenant" ou "Ensuite" — Explorer la
   * présélectionne et la surligne quand même (cohérence de navigation),
   * mais ne doit jamais faire défiler la page vers son propre doublon. */
  alreadyVisibleElsewhere: boolean;
}) {
  const initialCategory = categoryForSourceType(focusType);
  const [selected, setSelected] = useState<CategoryId | null>(initialCategory ?? null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  const focusKey = focusType && focusId ? `${focusType}:${focusId}` : undefined;

  useEffect(() => {
    if (!initialCategory || !focusKey || alreadyVisibleElsewhere) return;
    const el = focusRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center" });
    }
    // Une seule fois à l'ouverture du deep-link — jamais au changement manuel de catégorie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts: Record<CategoryId, number> = {
    objectives: data.objectives.length,
    milestones: data.milestones.length,
    workItems: data.workItems.length,
    decisions: data.decisions.length,
    risks: data.risks.length,
    issues: data.issues.length,
  };
  const totalCount = CATEGORY_ORDER.reduce((sum, id) => sum + counts[id], 0);

  if (totalCount === 0) {
    return (
      <section className="project-explorer" aria-label="Explorer">
        <h2 className="project-pilot-zone-title">Explorer</h2>
        <p className="project-explorer-empty">Rien à explorer pour l'instant.</p>
      </section>
    );
  }

  function refFor(sourceType: RecentChangeSourceType, id: string) {
    if (focusKey !== `${sourceType}:${id}`) return undefined;
    return (el: HTMLDivElement | null) => {
      focusRef.current = el;
    };
  }
  function focusedFor(sourceType: RecentChangeSourceType, id: string) {
    return focusKey === `${sourceType}:${id}`;
  }

  return (
    <section className="project-explorer" aria-label="Explorer">
      <h2 className="project-pilot-zone-title">Explorer</h2>
      <div className="project-explorer-chips" role="tablist" aria-label="Catégories du projet">
        {CATEGORY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected === id}
            className="project-explorer-chip tap-target"
            data-active={selected === id || undefined}
            onClick={() => setSelected(id)}
          >
            {CATEGORY_LABELS[id]} <span className="project-explorer-chip-count">{counts[id]}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="project-explorer-panel">
          {counts[selected] === 0 ? (
            <p className="project-explorer-empty">Aucun élément dans cette catégorie.</p>
          ) : (
            <ul className="project-explorer-panel-list">
              {selected === "objectives" &&
                data.objectives.map((o) => (
                  <li key={o.id}>
                    <ObjectiveCard objective={o} ref={refFor("objective", o.id)} focused={focusedFor("objective", o.id)} />
                  </li>
                ))}
              {selected === "milestones" &&
                data.milestones.map((m) => (
                  <li key={m.id}>
                    <AttentionEntityCard
                      ref={refFor("milestone", m.id)}
                      focused={focusedFor("milestone", m.id)}
                      title={m.observableResult}
                      statusLabel={m.status}
                      dueDate={m.targetDate}
                      needsAttention={m.needsAttention}
                      reason={m.reason}
                    />
                  </li>
                ))}
              {selected === "workItems" &&
                data.workItems.map((w) => (
                  <li key={w.id}>
                    <AttentionEntityCard
                      ref={refFor("work_item", w.id)}
                      focused={focusedFor("work_item", w.id)}
                      title={w.title}
                      statusLabel={w.status}
                      dueDate={w.dueDate}
                      needsAttention={w.needsAttention}
                      reason={w.reason}
                    />
                  </li>
                ))}
              {selected === "decisions" &&
                data.decisions.map((d) => (
                  <li key={d.id}>
                    <AttentionEntityCard
                      ref={refFor("decision", d.id)}
                      focused={focusedFor("decision", d.id)}
                      title={d.question}
                      statusLabel={d.status}
                      dueDate={d.dueDate}
                      needsAttention={d.needsAttention}
                      reason={d.reason}
                    />
                  </li>
                ))}
              {selected === "risks" &&
                data.risks.map((r) => (
                  <li key={r.id}>
                    <AttentionEntityCard
                      ref={refFor("risk", r.id)}
                      focused={focusedFor("risk", r.id)}
                      title={r.event}
                      statusLabel={r.status}
                      needsAttention={r.needsAttention}
                      reason={r.reason}
                      extra={r.criticality ? CRITICALITY_LABELS[r.criticality] : undefined}
                    />
                  </li>
                ))}
              {selected === "issues" &&
                data.issues.map((i) => (
                  <li key={i.id}>
                    <AttentionEntityCard
                      ref={refFor("issue", i.id)}
                      focused={focusedFor("issue", i.id)}
                      title={i.problem}
                      statusLabel={i.status}
                      dueDate={i.targetDate}
                      needsAttention={i.needsAttention}
                      reason={i.reason}
                    />
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
