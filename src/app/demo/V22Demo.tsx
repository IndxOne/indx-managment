import { useState } from "react";
import type { HomeOverviewProjection } from "../../domain/v3/home/types";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { V22Action } from "../components/v22/V22Action";
import { V22Home } from "../components/v22/V22Home";
import { V22Project } from "../components/v22/V22Project";
import "../styles/global.css";
import "../styles/management-v22.css";

/**
 * DÉMONSTRATION FICTIVE — données inventées, aucune connexion Supabase, aucun store, aucune auth.
 * Activée uniquement par ?ux-demo=v22 sur Preview/local (voir ux-v22.ts). Ne remplace jamais la QA connectée.
 */
const NOW = "2026-11-16T09:00:00.000Z";
const attention = {
  id: "decision:d1",
  sourceType: "decision" as const,
  sourceId: "d1",
  projectId: "p1",
  severity: "warning" as const,
  title: "Accès ERP multi-entités",
  reason: "Réponse de l'éditeur attendue pour confirmer la faisabilité.",
  dueDate: "2026-11-20T00:00:00.000Z",
  status: "ready",
  actionHint: "Relancer l'éditeur",
};
const home: HomeOverviewProjection = {
  generatedAt: NOW,
  attentionItems: [attention],
  projects: [
    {
      id: "p1",
      name: "Accès ERP multi-entités",
      status: "at_risk",
      criticality: "high",
      needsAttention: true,
      nextMilestone: { id: "m1", observableResult: "Prérequis validés", targetDate: "2026-11-27T00:00:00.000Z" },
    },
  ],
};
const overview: ProjectOverviewProjection = {
  project: { id: "p1", name: "Accès ERP multi-entités", status: "at_risk", method: "predictive", criticality: "high" },
  objectives: [],
  milestones: [
    { id: "m0", observableResult: "Consultation éditeur", status: "accepted", targetDate: "2026-11-13T00:00:00.000Z", needsAttention: false },
    { id: "m1", observableResult: "Prérequis validés", status: "planned", targetDate: "2026-11-27T00:00:00.000Z", needsAttention: false },
    { id: "m2", observableResult: "Faisabilité confirmée", status: "planned", targetDate: "2026-12-11T00:00:00.000Z", needsAttention: false },
  ],
  workItems: [
    { id: "w1", title: "Obtenir les prérequis de l'éditeur", status: "waiting_external", priority: "high", dueDate: "2026-11-20T00:00:00.000Z", needsAttention: true, reason: "Réponse de l'éditeur attendue" },
  ],
  decisions: [{ id: "d1", question: "Consulter l'éditeur avant le prestataire", status: "decided", hasDecider: true, needsAttention: false }],
  risks: [],
  issues: [],
  summary: {
    activeObjectivesCount: 0,
    openWorkItemsCount: 1,
    highCriticalRisksCount: 0,
    pendingDecisionsCount: 0,
    openIssuesCount: 0,
    nextMilestone: { id: "m1", observableResult: "Prérequis validés", targetDate: "2026-11-27T00:00:00.000Z" },
  },
  focusItem: { ...attention, id: "work_item:w1", sourceType: "work_item", sourceId: "w1", title: "Obtenir les prérequis de l'éditeur" },
  watchItems: [
    { id: "risk:r1", sourceType: "risk", sourceId: "r1", projectId: "p1", severity: "info", title: "Accès aux données ≠ accès réseau", reason: "Valider les droits entre entités avant toute ouverture.", status: "open" },
  ],
  recentChanges: [],
};

type Screen = "home" | "project" | "action";

export default function V22Demo() {
  const [screen, setScreen] = useState<Screen>("home");
  return (
    <div>
      <div className="v22-demo-banner" role="note">
        DÉMONSTRATION · données fictives · non connecté · distincte de la recette connectée
      </div>
      <nav className="v22-demo-nav" aria-label="Écrans de démonstration">
        {(["home", "project", "action"] as const).map((s) => (
          <button key={s} type="button" className="v22-btn tap-target" aria-current={screen === s ? "page" : undefined} onClick={() => setScreen(s)}>
            {s === "home" ? "Accueil" : s === "project" ? "Projet" : "Action"}
          </button>
        ))}
      </nav>
      <main className="app-main v22-screen">
        {screen === "home" && (
          <>
            <h1 className="v22-h1">Voyez l&apos;essentiel.</h1>
            <p className="v22-lede">Ce qui avance, ce qui attend et ce qui mérite votre attention.</p>
            <V22Home
              attentionItems={home.attentionItems}
              projects={home.projects}
              onOpenAttentionItem={() => setScreen("project")}
              onOpenProject={() => setScreen("project")}
            />
          </>
        )}
        {screen === "project" && <V22Project overview={overview} onOpenBrief={() => setScreen("home")} onOpenAction={() => setScreen("action")} />}
        {screen === "action" && <V22Action item={overview.workItems[0]!} projectName={overview.project.name} onBack={() => setScreen("project")} />}
      </main>
    </div>
  );
}
