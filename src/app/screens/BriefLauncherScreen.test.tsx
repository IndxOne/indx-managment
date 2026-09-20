import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BriefLauncherScreen } from "./BriefLauncherScreen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
}));

const listBriefProjectsMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/brief-projects", () => ({
  listBriefProjects: (...args: unknown[]) => listBriefProjectsMock(...args),
}));

const readBriefMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/brief-reader", () => ({
  readBrief: (...args: unknown[]) => readBriefMock(...args),
}));

function emptyBrief(projectId: string) {
  return {
    ok: true as const,
    value: {
      projectId,
      generatedAt: "2026-09-20T08:00:00.000Z",
      attentionItems: [],
      blockedItems: [],
      overdueItems: [],
      decisions: [],
      risks: [],
      milestones: [],
      summary: {
        blockingCount: 0,
        warningCount: 0,
        overdueCount: 0,
        decisionsNeedingAttentionCount: 0,
        criticalRisksCount: 0,
        milestonesNeedingAttentionCount: 0,
      },
    },
  };
}

beforeEach(() => {
  listBriefProjectsMock.mockReset();
  readBriefMock.mockReset();
});

describe("BriefLauncherScreen — comportement de la route brief", () => {
  it("0 projet accessible : EmptyState, pas une erreur technique", async () => {
    listBriefProjectsMock.mockResolvedValue({ ok: true, value: [] });
    render(<BriefLauncherScreen onBack={() => {}} />);
    expect(await screen.findByText("Aucun projet disponible pour le moment.")).toBeInTheDocument();
  });

  it("1 projet accessible : ouvre directement BriefScreen avec le bon projectId, sans étape de sélection", async () => {
    listBriefProjectsMock.mockResolvedValue({ ok: true, value: [{ id: "p1", name: "Refonte site client", status: "on_track" }] });
    readBriefMock.mockResolvedValue(emptyBrief("p1"));
    render(<BriefLauncherScreen onBack={() => {}} />);

    await screen.findByText("Rien ne nécessite ton attention actuellement.");
    expect(screen.queryByText("Choisir un projet")).not.toBeInTheDocument();
    expect(readBriefMock).toHaveBeenCalledWith(expect.anything(), "p1", expect.any(String));
  });

  it("plusieurs projets accessibles : affiche le sélecteur, une sélection transmet le bon projectId", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({
      ok: true,
      value: [
        { id: "p1", name: "Refonte site client", status: "on_track" },
        { id: "p2", name: "Migration ERP", status: "at_risk" },
      ],
    });
    readBriefMock.mockResolvedValue(emptyBrief("p2"));
    render(<BriefLauncherScreen onBack={() => {}} />);

    await screen.findByText("Choisir un projet");
    expect(screen.getByText("Refonte site client")).toBeInTheDocument();
    expect(screen.getByText("Migration ERP")).toBeInTheDocument();

    await user.click(screen.getByText("Migration ERP"));
    await screen.findByText("Rien ne nécessite ton attention actuellement.");
    expect(readBriefMock).toHaveBeenCalledWith(expect.anything(), "p2", expect.any(String));
  });

  it("erreur de lecture des projets : ErrorState, avec retry", async () => {
    listBriefProjectsMock.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "connection refused" } });
    listBriefProjectsMock.mockResolvedValueOnce({ ok: true, value: [] });
    const user = userEvent.setup();
    render(<BriefLauncherScreen onBack={() => {}} />);

    expect(await screen.findByText("Impossible de charger la liste des projets.")).toBeInTheDocument();
    expect(screen.queryByText(/connection refused/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Aucun projet disponible pour le moment.")).toBeInTheDocument();
  });

  it("appelle listBriefProjects avec le client Supabase courant, sans contournement de la RLS (aucun service_role)", async () => {
    listBriefProjectsMock.mockResolvedValue({ ok: true, value: [] });
    render(<BriefLauncherScreen onBack={() => {}} />);
    await screen.findByText("Aucun projet disponible pour le moment.");
    expect(listBriefProjectsMock).toHaveBeenCalledWith({});
  });
});
