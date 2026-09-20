import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { ProjectV3Screen } from "./ProjectV3Screen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
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

beforeEach(() => {
  readProjectOverviewMock.mockReset();
});

describe("ProjectV3Screen — états", () => {
  it("loading avant résolution", () => {
    readProjectOverviewMock.mockReturnValue(new Promise(() => {}));
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    expect(screen.getByText("Chargement du projet…")).toBeInTheDocument();
  });

  it("erreur technique : message utilisateur déterministe, jamais PersistenceError.message brut", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "unknown", message: "duplicate key value violates constraint xyz_pkey" },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    expect(await screen.findByText("Impossible de charger ce projet.")).toBeInTheDocument();
    expect(screen.queryByText(/xyz_pkey/)).not.toBeInTheDocument();
  });

  it("projet not_found : message dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    expect(await screen.findByText("Projet indisponible ou inaccessible.")).toBeInTheDocument();
  });

  it("retry relance readProjectOverview", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "x" } });
    readProjectOverviewMock.mockResolvedValueOnce({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Impossible de charger ce projet.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(readProjectOverviewMock).toHaveBeenCalledTimes(2));
  });

  it("sections vides masquées, résumé et accès Mon Brief toujours visibles", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("Objectifs")).not.toBeInTheDocument();
    expect(screen.queryByText("Jalons")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkItems")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mon Brief de ce projet" })).toBeInTheDocument();
  });
});

describe("ProjectV3Screen — projection correcte, ordre conservé, aucune mutation", () => {
  it("affiche les sections non vides dans l'ordre de la projection", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
        milestones: [
          { id: "m1", observableResult: "Design validé", status: "planned", targetDate: "2026-12-01T00:00:00.000Z", needsAttention: false },
        ],
        workItems: [
          { id: "w1", title: "Configurer VPN", status: "ready", priority: "normal", needsAttention: true, reason: "Aucun responsable assigné." },
        ],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);

    await screen.findByText("Migrer 100% des boîtes mail");
    expect(screen.getByText("Design validé")).toBeInTheDocument();
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.getByText("Aucun responsable assigné.")).toBeInTheDocument();
  });

  it("ne mute jamais la projection reçue", async () => {
    const overview = emptyOverview({
      objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
    });
    const snapshot = JSON.parse(JSON.stringify(overview));
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: overview });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Migrer 100% des boîtes mail");
    expect(overview).toEqual(snapshot);
  });

  it("n'affiche jamais un UUID brut (owner/decider/resolver, correctif §7)", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        objectives: [{ id: "o1", statement: "Objectif A", status: "active", hasOwner: true }],
        decisions: [{ id: "d1", question: "Question A", status: "to_prepare", hasDecider: true, needsAttention: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Objectif A");
    expect(screen.queryByText(/user-[a-f0-9-]+/i)).not.toBeInTheDocument();
  });
});

describe("ProjectV3Screen — focus (correctif §6)", () => {
  it("met en évidence l'élément si focusId présent dans la projection", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        workItems: [
          { id: "w1", title: "Item ciblé", status: "ready", priority: "normal", needsAttention: false },
          { id: "w2", title: "Autre item", status: "ready", priority: "normal", needsAttention: false },
        ],
      }),
    });
    render(<ProjectV3Screen projectId="p1" focusType="work_item" focusId="w1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Item ciblé");
    const focusedCard = screen.getByText("Item ciblé").closest("[data-focused]");
    expect(focusedCard).toHaveAttribute("data-focused", "true");
    const otherCard = screen.getByText("Autre item").closest("div.brief-item-card");
    expect(otherCard).not.toHaveAttribute("data-focused", "true");
  });

  it("focusId absent de la projection : affichage normal, aucune erreur", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        workItems: [{ id: "w1", title: "Item existant", status: "ready", priority: "normal", needsAttention: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" focusType="work_item" focusId="disparu" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Item existant");
    expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
  });

  it("aucun focusId : aucun élément mis en évidence, aucun modal", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        workItems: [{ id: "w1", title: "Item normal", status: "ready", priority: "normal", needsAttention: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} />);
    await screen.findByText("Item normal");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector('[data-focused="true"]')).toBeNull();
  });
});

describe("ProjectV3Screen — navigation", () => {
  it("« Mon Brief de ce projet » appelle onOpenBrief(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Mon Brief de ce projet" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });

  it("Retour appelle onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={onBack} onOpenBrief={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
