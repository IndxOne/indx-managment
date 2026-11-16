import { useState } from "react";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { MinimalProject } from "../components/minimal/MinimalProject";
import type { MinimalProjectCard } from "../minimal/build-minimal-projects";
import { MinimalProjectsList } from "../minimal/MinimalProjectsList";
import "../styles/global.css";
import "../styles/management-minimal.css";

/**
 * DÉMONSTRATION FICTIVE — données inventées, en mémoire, aucune connexion Supabase, aucune auth.
 * Activée par ?ux-demo=minimal sur Preview/local uniquement. Ne remplace jamais la recette connectée.
 */
const cards: MinimalProjectCard[] = [
  { id: "p1", name: "Déploiement ERP", status: "on_track", objective: "Mettre le nouvel ERP à disposition des équipes.", nextAction: { title: "Valider la recette", dueDate: "2026-11-30T12:00:00.000Z" }, targetDate: "2026-11-30T12:00:00.000Z", projectManager: "Camille", updatedAt: "2026-11-16T09:00:00.000Z" },
  { id: "p2", name: "Site vitrine", status: "at_risk", objective: "Publier une vitrine commerciale claire et accessible.", nextAction: { title: "Revoir les contenus" }, projectManager: "Alex", updatedAt: "2026-11-15T09:00:00.000Z" },
];

const initial: ProjectOverviewProjection = {
  project: { id: "p1", name: "Déploiement ERP", status: "on_track", method: "predictive", criticality: "medium", projectManager: "Camille", targetDate: "2026-11-30T12:00:00.000Z" },
  objectives: [{ id: "o1", statement: "Mettre le nouvel ERP à disposition des équipes.", status: "active", hasOwner: true }],
  milestones: [], decisions: [], risks: [], issues: [],
  workItems: [
    { id: "w1", title: "Valider la recette", status: "in_progress", priority: "normal", needsAttention: false },
    { id: "w2", title: "Préparer le guide utilisateur", status: "in_progress", priority: "normal", needsAttention: false },
  ],
  summary: { activeObjectivesCount: 1, openWorkItemsCount: 2, highCriticalRisksCount: 0, pendingDecisionsCount: 0, openIssuesCount: 0 },
  watchItems: [], recentChanges: [],
};

export default function MinimalDemo() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [overview, setOverview] = useState(initial);
  return (
    <div>
      <div className="mini-demo-banner" role="note">
        DÉMONSTRATION · données fictives en mémoire · non connecté · distincte de la recette connectée
      </div>
      {openId === null ? (
        <div className="mini-screen">
          <header className="mini-screen-head">
            <div>
              <p className="mini-eyebrow">Vue d&apos;ensemble</p>
              <h1 className="mini-h1">Mes projets</h1>
              <p className="mini-sub">L&apos;essentiel pour avancer, sans tableau de bord à déchiffrer.</p>
            </div>
          </header>
          <MinimalProjectsList projects={cards} onOpen={setOpenId} />
        </div>
      ) : (
        <div className="mini-screen">
          <button type="button" className="btn tap-target" onClick={() => setOpenId(null)}>← Mes projets</button>
          <MinimalProject
            overview={overview}
            access={{ canWrite: true, resolved: true, authUserId: "demo" }}
            onAdd={async (title) => {
              setOverview((o) => ({ ...o, workItems: [...o.workItems, { id: `w${o.workItems.length + 1}`, title, status: "in_progress", priority: "normal", needsAttention: false }] }));
              return null;
            }}
            onComplete={async (id) => {
              setOverview((o) => ({ ...o, workItems: o.workItems.map((w) => (w.id === id ? { ...w, status: "done" } : w)) }));
              return null;
            }}
          />
        </div>
      )}
    </div>
  );
}
