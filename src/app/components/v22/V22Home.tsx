import type { BriefItem } from "../../../domain/v3/brief/types";
import type { HomeProjectCard } from "../../../domain/v3/home/types";
import { PROJECT_STATUS_LABELS } from "../../utils/project-overview-labels";
import { projectStatusToTone } from "../../utils/tone";
import { BriefItemCard } from "../brief/BriefItemCard";
import { SeverityBadge } from "../SeverityBadge";
import { formatDay } from "./labels";

/** Accueil V2.2 — « À votre attention » + « Vos projets ». Présentation pure des projections Home ;
 * aucun compteur global ni progression (projection plafonnée à 5 projets, arbitrage GO 16/11). */
export function V22Home({
  attentionItems,
  projects,
  onOpenAttentionItem,
  onOpenProject,
}: {
  attentionItems: BriefItem[];
  projects: HomeProjectCard[];
  onOpenAttentionItem: (item: BriefItem) => void;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <>
      <section aria-labelledby="v22-attention" className="v22-section">
        <h2 id="v22-attention" className="v22-h2">À votre attention</h2>
        {attentionItems.length === 0 ? (
          <p className="v22-empty">Rien ne nécessite votre attention actuellement.</p>
        ) : (
          <div className="v22-stack">
            {attentionItems.map((item, index) => (
              <BriefItemCard key={item.id} item={item} featured={index === 0} onOpen={onOpenAttentionItem} />
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="v22-projects" className="v22-section">
        <h2 id="v22-projects" className="v22-h2">Vos projets</h2>
        {projects.length === 0 ? (
          <p className="v22-empty">Aucun projet actif pour l&apos;instant.</p>
        ) : (
          <div className="v22-stack">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="v22-project tap-target"
                onClick={() => onOpenProject(p.id)}
                aria-label={`Ouvrir le projet ${p.name}`}
              >
                <span className="v22-project-icon" aria-hidden="true">▦</span>
                <span className="v22-project-body">
                  <strong>{p.name}</strong>
                  <span className="v22-project-sub">
                    {p.nextMilestone
                      ? `Prochain jalon : ${p.nextMilestone.observableResult} · ${formatDay(p.nextMilestone.targetDate)}`
                      : "Aucun jalon planifié"}
                  </span>
                  <span className="v22-badges">
                    <SeverityBadge tone={projectStatusToTone(p.status)} label={PROJECT_STATUS_LABELS[p.status]} />
                    {p.needsAttention && <SeverityBadge tone="attention" label="Attention" />}
                  </span>
                </span>
                <span className="v22-open" aria-hidden="true">Ouvrir →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
