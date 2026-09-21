import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectsListProjection } from "../../domain/v3/projects-list/types";
import { ProjectsV3ListScreen } from "./ProjectsV3ListScreen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => true,
}));

const readProjectsListMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/projects-list-reader", () => ({
  readProjectsList: (...args: unknown[]) => readProjectsListMock(...args),
}));

const NOW = "2026-09-20T08:00:00.000Z";

beforeEach(() => {
  readProjectsListMock.mockClear();
});

function projection(overrides: Partial<ProjectsListProjection> = {}): ProjectsListProjection {
  return { generatedAt: NOW, projects: [], ...overrides };
}

function renderScreen(handlers: { onOpenProject?: ReturnType<typeof vi.fn>; onOpenLegacy?: ReturnType<typeof vi.fn> } = {}) {
  return render(
    <ProjectsV3ListScreen onOpenProject={handlers.onOpenProject ?? vi.fn()} onOpenLegacy={handlers.onOpenLegacy ?? vi.fn()} />
  );
}

describe("ProjectsV3ListScreen — V3 uniquement, structure", () => {
  it("ordre : header, filtres, liste, accès legacy", async () => {
    readProjectsListMock.mockResolvedValue({ ok: true, value: projection() });
    renderScreen();
    await waitFor(() => screen.getByText("Anciens espaces projet"));
    expect(screen.getByRole("heading", { name: "Projets" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Filtrer les projets" })).toBeInTheDocument();
  });

  it("affiche uniquement des cartes issues de readProjectsList (Project V3), jamais une donnée du store V2", async () => {
    readProjectsListMock.mockResolvedValue({
      ok: true,
      value: projection({
        projects: [{ id: "p1", name: "Migration M365 (V3)", status: "on_track", criticality: "high", needsAttention: false, updatedAt: NOW }],
      }),
    });
    renderScreen();
    await waitFor(() => expect(screen.getByText("Migration M365 (V3)")).toBeInTheDocument());
  });

  it("clic sur une carte -> onOpenProject(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenProject = vi.fn();
    readProjectsListMock.mockResolvedValue({
      ok: true,
      value: projection({
        projects: [{ id: "p7", name: "AMOA RH", status: "at_risk", criticality: "medium", needsAttention: false, updatedAt: NOW }],
      }),
    });
    renderScreen({ onOpenProject });
    await waitFor(() => screen.getByText("AMOA RH"));
    await user.click(screen.getByRole("button", { name: /AMOA RH/ }));
    expect(onOpenProject).toHaveBeenCalledWith("p7");
  });

  it("lien « Anciens espaces projet » -> onOpenLegacy", async () => {
    const user = userEvent.setup();
    const onOpenLegacy = vi.fn();
    readProjectsListMock.mockResolvedValue({ ok: true, value: projection() });
    renderScreen({ onOpenLegacy });
    await waitFor(() => screen.getByRole("button", { name: "Anciens espaces projet" }));
    await user.click(screen.getByRole("button", { name: "Anciens espaces projet" }));
    expect(onOpenLegacy).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectsV3ListScreen — filtres", () => {
  const threeProjects: ProjectsListProjection = projection({
    projects: [
      { id: "p-active", name: "Projet actif", status: "on_track", criticality: "medium", needsAttention: false, updatedAt: NOW },
      { id: "p-risk", name: "Projet à risque", status: "at_risk", criticality: "high", needsAttention: true, attentionLevel: "warning", updatedAt: NOW },
      { id: "p-closed", name: "Projet clôturé", status: "closed", criticality: "low", needsAttention: false, updatedAt: NOW },
    ],
  });

  it("Actifs (défaut) exclut les clôturés, inclut les à risque", async () => {
    readProjectsListMock.mockResolvedValue({ ok: true, value: threeProjects });
    renderScreen();
    await waitFor(() => screen.getByText("Projet actif"));
    expect(screen.getByText("Projet à risque")).toBeInTheDocument();
    expect(screen.queryByText("Projet clôturé")).not.toBeInTheDocument();
  });

  it("bascule vers À risque -> seul le projet at_risk/off_track reste, sans requête réseau supplémentaire", async () => {
    const user = userEvent.setup();
    readProjectsListMock.mockResolvedValue({ ok: true, value: threeProjects });
    renderScreen();
    await waitFor(() => screen.getByText("Projet actif"));
    await user.click(screen.getByRole("tab", { name: "À risque" }));
    expect(screen.getByText("Projet à risque")).toBeInTheDocument();
    expect(screen.queryByText("Projet actif")).not.toBeInTheDocument();
    expect(screen.queryByText("Projet clôturé")).not.toBeInTheDocument();
    expect(readProjectsListMock).toHaveBeenCalledTimes(1);
  });

  it("bascule vers Clôturés -> seul le projet closed reste", async () => {
    const user = userEvent.setup();
    readProjectsListMock.mockResolvedValue({ ok: true, value: threeProjects });
    renderScreen();
    await waitFor(() => screen.getByText("Projet actif"));
    await user.click(screen.getByRole("tab", { name: "Clôturés" }));
    expect(screen.getByText("Projet clôturé")).toBeInTheDocument();
    expect(screen.queryByText("Projet actif")).not.toBeInTheDocument();
  });

  it("aucun résultat pour un filtre -> message dédié", async () => {
    const user = userEvent.setup();
    readProjectsListMock.mockResolvedValue({
      ok: true,
      value: projection({ projects: [{ id: "p1", name: "Actif seul", status: "on_track", criticality: "low", needsAttention: false, updatedAt: NOW }] }),
    });
    renderScreen();
    await waitFor(() => screen.getByText("Actif seul"));
    await user.click(screen.getByRole("tab", { name: "Clôturés" }));
    expect(screen.getByText("Aucun projet ne correspond à ce filtre.")).toBeInTheDocument();
  });
});

describe("ProjectsV3ListScreen — états", () => {
  it("erreur -> ErrorState avec retry", async () => {
    readProjectsListMock.mockResolvedValue({ ok: false, error: { kind: "persistence", code: "unknown", message: "boom" } });
    renderScreen();
    await waitFor(() => expect(screen.getByText("Impossible de charger tes projets.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("0 projet V3 -> état vide informatif, jamais de bouton Créer", async () => {
    readProjectsListMock.mockResolvedValue({ ok: true, value: projection() });
    renderScreen();
    await waitFor(() => expect(screen.getByText(/Aucun projet V3 pour le moment/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Créer/ })).not.toBeInTheDocument();
  });
});
