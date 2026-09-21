import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProjectsListProjection } from "../domain/v3/projects-list/types";
import type { ProjectOverviewProjection } from "../domain/v3/project-overview/types";
import { App } from "./App";

/**
 * Fichier séparé (vi.mock hoisté par module) : mocker Supabase comme
 * configuré ici ne touche pas les autres tests App.test.tsx, qui reposent
 * sur "non configuré" pour rester sur les flux V2 legacy.
 */
/**
 * `HomeScreen` (route initiale "today") appelle `readHomeOverview` au
 * montage, indépendamment de ce que ce test exerce (navigation Projets V3) :
 * `.from()` doit rester chainable et résoudre à vide plutôt que de laisser
 * une requête non mockée planter en rejet non géré.
 */
function chainableEmptyQuery(): PromiseLike<{ data: unknown[]; error: null }> & Record<string, unknown> {
  const result = Promise.resolve({ data: [], error: null });
  const chain = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    then: result.then.bind(result),
  };
  return chain as unknown as PromiseLike<{ data: unknown[]; error: null }> & Record<string, unknown>;
}

vi.mock("./adapters/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => chainableEmptyQuery(),
  }),
  isSupabaseConfigured: () => true,
}));

const readProjectsListMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/projects-list-reader", () => ({
  readProjectsList: (...args: unknown[]) => readProjectsListMock(...args),
}));

const readProjectOverviewMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/project-overview-reader", () => ({
  readProjectOverview: (...args: unknown[]) => readProjectOverviewMock(...args),
}));

const NOW = "2026-09-20T08:00:00.000Z";

function projectsListProjection(): ProjectsListProjection {
  return {
    generatedAt: NOW,
    projects: [
      {
        id: "proj-1",
        name: "Migration ERP",
        status: "on_track",
        criticality: "medium",
        needsAttention: false,
        updatedAt: NOW,
      },
    ],
  };
}

function projectOverview(): ProjectOverviewProjection {
  return {
    project: {
      id: "proj-1",
      name: "Migration ERP",
      status: "on_track",
      method: "predictive",
      criticality: "medium",
    },
    objectives: [],
    milestones: [],
    workItems: [],
    decisions: [],
    risks: [],
    issues: [],
    summary: {
      activeObjectivesCount: 0,
      openWorkItemsCount: 0,
      highCriticalRisksCount: 0,
      pendingDecisionsCount: 0,
      openIssuesCount: 0,
    },
  };
}

describe("App — navigation Projets V3 -> Projet V3 -> Retour (UX-3)", () => {
  it("ouvrir un projet depuis l'onglet Projets puis faire Retour revient sur la liste Projets, jamais sur « Plus »", async () => {
    readProjectsListMock.mockResolvedValue({ ok: true, value: projectsListProjection() });
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: projectOverview() });

    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));

    await user.click(await screen.findByText("Migration ERP"));
    await screen.findByRole("button", { name: "Retour" });

    await user.click(screen.getByRole("button", { name: "Retour" }));

    // De retour sur la liste Projets V3 — pas sur le menu "Plus".
    expect(await screen.findByText("Migration ERP")).toBeInTheDocument();
    expect(screen.queryByText("Récurrences actives")).not.toBeInTheDocument();
  });
});
