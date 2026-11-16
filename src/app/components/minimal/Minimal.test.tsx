import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { MinimalProject } from "./MinimalProject";

const overview = (o: Partial<ProjectOverviewProjection> = {}): ProjectOverviewProjection => ({
  project: { id: "p1", name: "Site vitrine", status: "on_track", method: "predictive", criticality: "medium", projectManager: "Alex", targetDate: "2026-12-01T12:00:00.000Z" },
  objectives: [{ id: "o1", statement: "Publier une vitrine claire", status: "active", hasOwner: true }],
  milestones: [],
  workItems: [
    { id: "w1", title: "Revoir les contenus", status: "in_progress", priority: "normal", needsAttention: false },
    { id: "w2", title: "Choisir l'hébergeur", status: "blocked", priority: "normal", needsAttention: true },
    { id: "w3", title: "Maquette validée", status: "done", priority: "normal", needsAttention: false },
  ],
  decisions: [], risks: [], issues: [],
  summary: { activeObjectivesCount: 1, openWorkItemsCount: 2, highCriticalRisksCount: 0, pendingDecisionsCount: 0, openIssuesCount: 0 },
  watchItems: [], recentChanges: [],
  ...o,
});
const rw = { canWrite: true, resolved: true, authUserId: "u1" };
const ro = { canWrite: false, resolved: true };

describe("MinimalProject — six éléments", () => {
  it("nom, objectif, statut, échéance, responsable, progression des actions", () => {
    render(<MinimalProject overview={overview()} access={rw} onAdd={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Site vitrine" })).toBeInTheDocument();
    expect(screen.getByText("Publier une vitrine claire")).toBeInTheDocument();
    expect(screen.getByText("Dans les temps")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText(/1 déc\. 2026/)).toBeInTheDocument();
    expect(screen.getByText("1/3 terminées")).toBeInTheDocument();
  });
  it("sans objectif / responsable / échéance : libellés explicites", () => {
    render(<MinimalProject overview={overview({ objectives: [], project: { id: "p1", name: "X", status: "on_track", method: "agile", criticality: "low" } })} access={ro} onAdd={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Aucun objectif renseigné.")).toBeInTheDocument();
    expect(screen.getByText("Non défini")).toBeInTheDocument();
    expect(screen.getByText("Non définie")).toBeInTheDocument();
  });
});

describe("MinimalProject — gestes", () => {
  it("terminer : seulement les actions terminables, jamais de bouton inopérant", async () => {
    const onComplete = vi.fn().mockResolvedValue(null);
    render(<MinimalProject overview={overview()} access={rw} onAdd={vi.fn()} onComplete={onComplete} />);
    expect(screen.queryByRole("button", { name: /Terminer l'action Choisir/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Terminer l'action Revoir les contenus" }));
    expect(onComplete).toHaveBeenCalledWith("w1");
  });
  it("erreur d'écriture affichée en alerte", async () => {
    render(<MinimalProject overview={overview()} access={rw} onAdd={vi.fn()} onComplete={vi.fn().mockResolvedValue("Modifié ailleurs")} />);
    await userEvent.click(screen.getByRole("button", { name: "Terminer l'action Revoir les contenus" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Modifié ailleurs");
  });
  it("ajouter : formulaire, appel, fermeture ; erreur conserve la saisie", async () => {
    const onAdd = vi.fn().mockResolvedValueOnce("Échec").mockResolvedValueOnce(null);
    render(<MinimalProject overview={overview()} access={rw} onAdd={onAdd} onComplete={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "+ Ajouter" }));
    await userEvent.type(screen.getByLabelText("Action"), "Appeler le client");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter l'action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Échec");
    expect(screen.getByLabelText("Action")).toHaveValue("Appeler le client");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter l'action" }));
    await waitFor(() => expect(screen.queryByLabelText("Action")).not.toBeInTheDocument());
    expect(onAdd).toHaveBeenLastCalledWith("Appeler le client");
  });
  it("lecture seule : aucun geste d'écriture, message explicite", () => {
    render(<MinimalProject overview={overview()} access={ro} onAdd={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "+ Ajouter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Terminer l'action/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Lecture seule/)).toBeInTheDocument();
  });
  it("rôle pas encore résolu : ni gestes ni message trompeur", () => {
    render(<MinimalProject overview={overview()} access={{ canWrite: false, resolved: false }} onAdd={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.queryByText(/Lecture seule/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Ajouter" })).not.toBeInTheDocument();
  });
  it("terminées repliées, sans « rouvrir »", () => {
    render(<MinimalProject overview={overview()} access={rw} onAdd={vi.fn()} onComplete={vi.fn()} detail={<p>Historique</p>} />);
    expect(screen.getByText("Terminées · 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rouvrir/i })).not.toBeInTheDocument();
    expect(screen.getByText("Historique")).toBeInTheDocument();
  });
});

describe("CreateProjectDialog", () => {
  it("nom + objectif requis, valeurs transmises, erreur affichée, Échap ferme", async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce("Droits insuffisants").mockResolvedValueOnce(null);
    const onClose = vi.fn();
    render(<CreateProjectDialog onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Nouveau projet" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du projet")).toBeRequired();
    expect(screen.getByLabelText("Objectif")).toBeRequired();
    await userEvent.type(screen.getByLabelText("Nom du projet"), "Refonte");
    await userEvent.type(screen.getByLabelText("Objectif"), "Moderniser");
    await userEvent.click(screen.getByRole("button", { name: "Créer le projet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Droits insuffisants");
    expect(onSubmit).toHaveBeenCalledWith({ name: "Refonte", objective: "Moderniser", projectManager: "", dueDate: "" });
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
