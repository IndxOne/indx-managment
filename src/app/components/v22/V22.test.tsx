import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BriefItem } from "../../../domain/v3/brief/types";
import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";
import { V22Action } from "./V22Action";
import { V22Home } from "./V22Home";
import { V22Project } from "./V22Project";

const brief = (o: Partial<BriefItem> = {}): BriefItem => ({
  id: "decision:d1",
  sourceType: "decision",
  sourceId: "d1",
  projectId: "p1",
  severity: "warning",
  title: "Accès ERP",
  reason: "Réponse attendue",
  status: "ready",
  ...o,
});

const overview = (o: Partial<ProjectOverviewProjection> = {}): ProjectOverviewProjection => ({
  project: { id: "p1", name: "Migration ERP", status: "at_risk", method: "predictive", criticality: "high" },
  objectives: [],
  milestones: [
    { id: "m2", observableResult: "Recette", status: "planned", targetDate: "2026-12-11T00:00:00.000Z", needsAttention: false },
    { id: "m1", observableResult: "Cadrage", status: "accepted", targetDate: "2026-11-13T00:00:00.000Z", needsAttention: false },
  ],
  workItems: [{ id: "w1", title: "Obtenir les prérequis", status: "waiting_external", priority: "high", needsAttention: true, reason: "Éditeur" }],
  decisions: [{ id: "d1", question: "Consulter l'éditeur", status: "decided", hasDecider: true, needsAttention: false }],
  risks: [],
  issues: [],
  summary: { activeObjectivesCount: 0, openWorkItemsCount: 1, highCriticalRisksCount: 0, pendingDecisionsCount: 0, openIssuesCount: 0 },
  watchItems: [],
  recentChanges: [],
  focusItem: brief({ id: "work_item:w1", sourceType: "work_item", sourceId: "w1", title: "Obtenir les prérequis" }),
  ...o,
});

describe("V22Home", () => {
  it("première priorité mise en avant, aucun compteur ni progression, ouverture projet", async () => {
    const onOpenProject = vi.fn();
    render(
      <V22Home
        attentionItems={[brief()]}
        projects={[{ id: "p1", name: "Migration ERP", status: "on_track", criticality: "high", needsAttention: true }]}
        onOpenAttentionItem={vi.fn()}
        onOpenProject={onOpenProject}
      />,
    );
    expect(screen.getByText("Prochaine décision")).toBeInTheDocument();
    expect(screen.getByText("Aucun jalon planifié")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir le projet Migration ERP" }));
    expect(onOpenProject).toHaveBeenCalledWith("p1");
  });
  it("états vides explicites", () => {
    render(<V22Home attentionItems={[]} projects={[]} onOpenAttentionItem={vi.fn()} onOpenProject={vi.fn()} />);
    expect(screen.getByText(/Rien ne nécessite votre attention/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun projet actif/)).toBeInTheDocument();
  });
});

describe("V22Project", () => {
  it("un seul h1, parcours trié par date, action ouvrable depuis le focus, détail conservé", async () => {
    const onOpenAction = vi.fn();
    render(<V22Project overview={overview()} onOpenBrief={vi.fn()} onOpenAction={onOpenAction} detail={<p>Explorer historique</p>} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const steps = screen.getAllByRole("listitem").filter((li) => li.className.includes("v22-step"));
    expect(steps[0]).toHaveTextContent("Cadrage");
    expect(steps[1]).toHaveTextContent("Recette");
    await userEvent.click(screen.getByRole("button", { name: "Ouvrir l'action" }));
    expect(onOpenAction).toHaveBeenCalledWith("w1");
    expect(screen.getByText("Explorer historique")).toBeInTheDocument();
  });
  it("focus non-action : pas de bouton d'action inopérant, accès Mon Brief", async () => {
    const onOpenBrief = vi.fn();
    render(
      <V22Project
        overview={overview({ focusItem: brief() })}
        onOpenBrief={onOpenBrief}
        onOpenAction={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Ouvrir l'action" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voir dans Mon Brief" }));
    expect(onOpenBrief).toHaveBeenCalled();
  });
  it("sans focus ni jalon : états vides", () => {
    render(<V22Project overview={overview({ focusItem: undefined, milestones: [] })} onOpenBrief={vi.fn()} onOpenAction={vi.fn()} />);
    expect(screen.getByText(/Rien de critique/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun jalon planifié/)).toBeInTheDocument();
  });
});

describe("V22Action", () => {
  it("lecture seule : aucune action de modification, retour fonctionnel", async () => {
    const onBack = vi.fn();
    render(<V22Action item={overview().workItems[0]!} projectName="Migration ERP" onBack={onBack} />);
    expect(screen.getByRole("heading", { level: 1, name: "Obtenir les prérequis" })).toBeInTheDocument();
    expect(screen.getAllByText("En attente externe").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /terminer|enregistrer|modifier/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retour au projet/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
