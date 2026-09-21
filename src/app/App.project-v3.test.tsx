import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { App } from "./App";

/**
 * Fichier séparé de App.test.tsx / App.brief.test.tsx : vi.mock est hoisté
 * en tête de module (même contrainte que ces deux fichiers).
 */
vi.mock("./adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => false,
}));

const listBriefProjectsMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/brief-projects", () => ({
  listBriefProjects: (...args: unknown[]) => listBriefProjectsMock(...args),
}));

const readBriefMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/brief-reader", () => ({
  readBrief: (...args: unknown[]) => readBriefMock(...args),
}));

const readProjectOverviewMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/project-overview-reader", () => ({
  readProjectOverview: (...args: unknown[]) => readProjectOverviewMock(...args),
}));

const briefFixture = {
  ok: true as const,
  value: {
    projectId: "p1",
    generatedAt: "2026-09-20T08:00:00.000Z",
    attentionItems: [
      {
        id: "work_item:wi1",
        sourceType: "work_item" as const,
        sourceId: "wi1",
        projectId: "p1",
        severity: "blocking" as const,
        title: "Configurer VPN",
        reason: "Aucun responsable assigné.",
        status: "ready",
      },
    ],
    blockedItems: [],
    overdueItems: [],
    decisions: [],
    risks: [],
    milestones: [],
    summary: {
      blockingCount: 1,
      warningCount: 0,
      overdueCount: 0,
      decisionsNeedingAttentionCount: 0,
      criticalRisksCount: 0,
      milestonesNeedingAttentionCount: 0,
    },
  },
};

const overviewFixture = {
  ok: true as const,
  value: {
    project: { id: "p1", name: "Migration M365", status: "on_track" as const, method: "predictive" as const, criticality: "high" as const },
    objectives: [],
    milestones: [],
    workItems: [
      { id: "wi1", title: "Configurer VPN", status: "ready", priority: "normal", needsAttention: true, reason: "Aucun responsable assigné." },
    ],
    decisions: [],
    risks: [],
    issues: [],
    summary: {
      activeObjectivesCount: 0,
      openWorkItemsCount: 1,
      highCriticalRisksCount: 0,
      pendingDecisionsCount: 0,
      openIssuesCount: 0,
    },
    watchItems: [],
    recentChanges: [],
  },
};

beforeEach(() => {
  listBriefProjectsMock.mockReset();
  readBriefMock.mockReset();
  readProjectOverviewMock.mockReset();
});

async function openBriefWithSingleProject(user: ReturnType<typeof userEvent.setup>) {
  listBriefProjectsMock.mockResolvedValue({ ok: true, value: [{ id: "p1", name: "Migration M365", status: "on_track" }] });
  readBriefMock.mockResolvedValue(briefFixture);
  render(<App />);
  await screen.findByRole("button", { name: /Accueil/ });
  await user.click(
    screen.getByRole("button", {
      name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
    })
  );
  await user.click(screen.getByRole("button", { name: "Mon Brief" }));
}

describe("App — navigation Mon Brief → Projet V3 (Lot 4)", () => {
  it("un clic sur une carte Brief ouvre le Projet V3 avec projectId/focusType/focusId corrects", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue(overviewFixture);
    await openBriefWithSingleProject(user);

    const card = await screen.findByRole("button", { name: /Configurer VPN/ });
    await user.click(card);

    await screen.findByText("Migration M365");
    expect(readProjectOverviewMock).toHaveBeenCalledWith(expect.anything(), "p1", expect.any(String));
  });

  it("depuis le Projet V3, « Mon Brief de ce projet » ouvre directement BriefScreen sans repasser par le launcher", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue(overviewFixture);
    await openBriefWithSingleProject(user);

    const card = await screen.findByRole("button", { name: /Configurer VPN/ });
    await user.click(card);
    await screen.findByText("Migration M365");

    listBriefProjectsMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Mon Brief de ce projet" }));

    await screen.findByText("Configurer VPN");
    // Le launcher (listBriefProjects) n'est jamais réinvoqué : BriefScreen
    // ouvert directement avec le projectId déjà connu (correctif de gate §5).
    expect(listBriefProjectsMock).not.toHaveBeenCalled();
  });
});
