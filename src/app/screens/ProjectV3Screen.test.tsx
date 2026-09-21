import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { resetAuthStateForTests } from "../hooks/useAuthState";
import { ProjectV3Screen } from "./ProjectV3Screen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => true,
}));

/** Authentifié par défaut (hotfix 401 V3, cf. useAuthState.ts) — les tests
 * dédiés surchargent `getCurrentAuthUserIdMock` localement. */
const getCurrentAuthUserIdMock = vi.fn(async (): Promise<string | null> => "test-auth-user");
vi.mock("../adapters/supabase/auth", () => ({
  getCurrentAuthUserId: () => getCurrentAuthUserIdMock(),
  onAuthStateChange: () => () => {},
}));

const readProjectOverviewMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/project-overview-reader", () => ({
  readProjectOverview: (...args: unknown[]) => readProjectOverviewMock(...args),
}));

function emptyOverview(overrides: Partial<ProjectOverviewProjection> = {}): ProjectOverviewProjection {
  return {
    project: {
      id: "p1",
      name: "Migration M365",
      status: "on_track",
      method: "predictive",
      criticality: "high",
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
    ...overrides,
  };
}

const focusItemFixture = {
  id: "work_item:w1",
  sourceType: "work_item" as const,
  sourceId: "w1",
  projectId: "p1",
  severity: "blocking" as const,
  title: "Configurer VPN",
  reason: "Aucun responsable assigné.",
  status: "ready",
};

beforeEach(() => {
  resetAuthStateForTests();
  getCurrentAuthUserIdMock.mockReset().mockResolvedValue("test-auth-user");
  readProjectOverviewMock.mockReset();
});
afterEach(() => {
  resetAuthStateForTests();
});

describe("ProjectV3Screen — états", () => {
  it("loading avant résolution", () => {
    readProjectOverviewMock.mockReturnValue(new Promise(() => {}));
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(screen.getByText("Chargement du projet…")).toBeInTheDocument();
  });

  it("erreur technique : message utilisateur déterministe, jamais PersistenceError.message brut", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "unknown", message: "duplicate key value violates constraint xyz_pkey" },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Impossible de charger ce projet.")).toBeInTheDocument();
    expect(screen.queryByText(/xyz_pkey/)).not.toBeInTheDocument();
  });

  it("projet not_found : message dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Projet indisponible ou inaccessible.")).toBeInTheDocument();
  });

  it("retry relance readProjectOverview", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "x" } });
    readProjectOverviewMock.mockResolvedValueOnce({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Impossible de charger ce projet.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(readProjectOverviewMock).toHaveBeenCalledTimes(2));
  });
});

describe("ProjectV3Screen — UX-5.1 shell (Focus maintenant / Ensuite)", () => {
  it("Focus maintenant affiche l'élément le plus prioritaire de la projection", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.getByText("Aucun responsable assigné.")).toBeInTheDocument();
  });

  it("aucun focusItem : état positif compact, aucune erreur", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Rien de critique à traiter maintenant.")).toBeInTheDocument();
  });

  it("Ensuite affiche le prochain jalon quand présent", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        summary: {
          activeObjectivesCount: 0,
          openWorkItemsCount: 0,
          highCriticalRisksCount: 0,
          pendingDecisionsCount: 0,
          openIssuesCount: 0,
          nextMilestone: { id: "m1", observableResult: "Design validé", targetDate: "2026-12-01T00:00:00.000Z" },
        },
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Design validé")).toBeInTheDocument();
  });

  it("aucun prochain jalon : état compact dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Aucun jalon planifié.")).toBeInTheDocument();
  });

  it("n'affiche plus ProjectSummaryGrid (6 KPI) dans UX-5.1", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("Objectifs actifs")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkItems ouverts")).not.toBeInTheDocument();
  });

  it("n'affiche plus les 6 anciennes sections détaillées dans UX-5.1", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
        milestones: [
          { id: "m1", observableResult: "Design validé", status: "planned", targetDate: "2026-12-01T00:00:00.000Z", needsAttention: false },
        ],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("Objectifs")).not.toBeInTheDocument();
    expect(screen.queryByText("Jalons")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkItems")).not.toBeInTheDocument();
    expect(screen.queryByText("Décisions")).not.toBeInTheDocument();
    expect(screen.queryByText("Risques")).not.toBeInTheDocument();
    expect(screen.queryByText("Issues")).not.toBeInTheDocument();
    // La donnée existe toujours dans la projection (objectives non vide),
    // simplement plus rendue sous forme de section détaillée ici.
    expect(screen.queryByText("Migrer 100% des boîtes mail")).not.toBeInTheDocument();
  });

  it("rendu mobile : shell en une colonne, aucune largeur fixe en px", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    const { container } = render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(container.querySelector(".project-pilot-shell")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/width:\s*\d+px/);
  });
});

describe("ProjectV3Screen — deep-link (focusType/focusId, §7)", () => {
  it("cible le focus affiché : mis en évidence sur place, sans erreur", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    render(
      <ProjectV3Screen projectId="p1" focusType="work_item" focusId="w1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Configurer VPN");
    const card = screen.getByText("Configurer VPN").closest("[data-focused]");
    expect(card).toHaveAttribute("data-focused", "true");
  });

  it("cible une entité non (encore) visible dans le shell : aucune erreur, navigation non cassée", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(
      <ProjectV3Screen projectId="p1" focusType="risk" focusId="disparu" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Migration M365");
    expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProjectV3Screen — navigation", () => {
  it("« Mon Brief de ce projet » appelle onOpenBrief(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Mon Brief de ce projet" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });

  it("« Explorer le reste du projet » appelle aussi onOpenBrief (fallback documenté, UX-5.2 différé)", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Explorer le reste du projet" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });

  it("Retour appelle onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={onBack} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectV3Screen — hotfix 401 : session Auth requise avant toute lecture V3", () => {
  it("sans session : 0 lecture réseau V3, CTA Se connecter", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    const onOpenAuth = vi.fn();
    const user = userEvent.setup();
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={onOpenAuth} />);

    expect(await screen.findByText("Connexion requise")).toBeInTheDocument();
    expect(readProjectOverviewMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });

  it("authentifié : readProjectOverview s'exécute normalement", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await waitFor(() => expect(readProjectOverviewMock).toHaveBeenCalledTimes(1));
  });
});
