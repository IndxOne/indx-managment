import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import type { BriefItem, BriefProjection } from "../../domain/v3/brief/types";
import { resetAuthStateForTests } from "../hooks/useAuthState";
import { BriefScreen } from "./BriefScreen";

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

const readBriefMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/brief-reader", () => ({
  readBrief: (...args: unknown[]) => readBriefMock(...args),
}));

const NOW = "2026-09-20T08:00:00.000Z";

function item(overrides: Partial<BriefItem>): BriefItem {
  return {
    id: "id",
    sourceType: "work_item",
    sourceId: "id",
    projectId: "p1",
    severity: "info",
    title: "Titre",
    reason: "Raison",
    status: "open",
    ...overrides,
  };
}

// A : blocking/work_item, présent uniquement dans attentionItems (pas bloqué au sens état, pas en retard).
const itemA = item({ id: "a", sourceId: "a", sourceType: "work_item", severity: "blocking", title: "Item A" });
// B : warning/decision, en retard (overdueItems) et décision (decisions).
const itemB = item({ id: "b", sourceId: "b", sourceType: "decision", severity: "warning", title: "Item B", dueDate: "2026-09-01T00:00:00.000Z" });
// C : warning/dependency, bloqué au sens état (blockedItems) — PAS blocking en sévérité.
const itemC = item({ id: "c", sourceId: "c", sourceType: "dependency", severity: "warning", title: "Item C", status: "delayed" });

function briefFixture(overrides: Partial<BriefProjection> = {}): BriefProjection {
  return {
    projectId: "p1",
    generatedAt: NOW,
    attentionItems: [itemA, itemB, itemC],
    blockedItems: [itemC],
    overdueItems: [itemB],
    decisions: [itemB],
    risks: [],
    milestones: [],
    summary: {
      blockingCount: 1,
      warningCount: 2,
      overdueCount: 1,
      decisionsNeedingAttentionCount: 1,
      criticalRisksCount: 0,
      milestonesNeedingAttentionCount: 0,
    },
    ...overrides,
  };
}

beforeEach(() => {
  resetAuthStateForTests();
  getCurrentAuthUserIdMock.mockReset().mockResolvedValue("test-auth-user");
  readBriefMock.mockReset();
});
afterEach(() => {
  resetAuthStateForTests();
});

describe("BriefScreen — filtres respectent les projections du domaine", () => {
  it("Tous conserve l'ordre exact de attentionItems", async () => {
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);

    const titles = await screen.findAllByText(/^Item [ABC]$/);
    expect(titles.map((t) => t.textContent)).toEqual(["Item A", "Item B", "Item C"]);
  });

  it("Bloquants affiche exactement blockedItems (Item C), jamais un recalcul severity===blocking (Item A)", async () => {
    const user = userEvent.setup();
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);

    await screen.findByText("Item A");
    await user.click(screen.getByRole("button", { name: "Bloquants" }));

    expect(screen.getByText("Item C")).toBeInTheDocument();
    expect(screen.queryByText("Item A")).not.toBeInTheDocument();
    expect(screen.queryByText("Item B")).not.toBeInTheDocument();
  });

  it("Retards affiche exactement overdueItems (Item B)", async () => {
    const user = userEvent.setup();
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);

    await screen.findByText("Item A");
    await user.click(screen.getByRole("button", { name: "Retards" }));

    expect(screen.getByText("Item B")).toBeInTheDocument();
    expect(screen.queryByText("Item A")).not.toBeInTheDocument();
    expect(screen.queryByText("Item C")).not.toBeInTheDocument();
  });

  it("now est transmis tel quel jusqu'à readBrief", async () => {
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Item A");
    expect(readBriefMock).toHaveBeenCalledWith(expect.anything(), "p1", expect.any(String));
  });

  it("ne mute jamais les tableaux source de BriefProjection", async () => {
    const brief = briefFixture();
    const snapshot = JSON.parse(JSON.stringify(brief));
    readBriefMock.mockResolvedValue({ ok: true, value: brief });
    const user = userEvent.setup();
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Item A");
    await user.click(screen.getByRole("button", { name: "Bloquants" }));
    await user.click(screen.getByRole("button", { name: "Tous" }));
    expect(brief).toEqual(snapshot);
  });
});

describe("BriefScreen — états", () => {
  it("loading avant résolution", () => {
    readBriefMock.mockReturnValue(new Promise(() => {}));
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    expect(screen.getByText("Chargement de Mon Brief…")).toBeInTheDocument();
  });

  it("empty : aucun item pertinent affiche le message dédié", async () => {
    readBriefMock.mockResolvedValue({
      ok: true,
      value: briefFixture({ attentionItems: [], blockedItems: [], overdueItems: [], decisions: [], risks: [], milestones: [] }),
    });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Rien ne nécessite ton attention actuellement.")).toBeInTheDocument();
  });

  it("erreur technique : message utilisateur déterministe, jamais PersistenceError.message brut", async () => {
    readBriefMock.mockResolvedValue({ ok: false, error: { kind: "persistence", code: "unknown", message: "duplicate key value violates constraint xyz_pkey" } });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Impossible de charger Mon Brief.")).toBeInTheDocument();
    expect(screen.queryByText(/xyz_pkey/)).not.toBeInTheDocument();
  });

  it("erreur projet absent : message dédié", async () => {
    readBriefMock.mockResolvedValue({ ok: false, error: { kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." } });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Brief indisponible pour ce projet.")).toBeInTheDocument();
  });

  it("retry relance readBrief", async () => {
    const user = userEvent.setup();
    readBriefMock.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "x" } });
    readBriefMock.mockResolvedValueOnce({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Impossible de charger Mon Brief.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByText("Item A");
    await waitFor(() => expect(readBriefMock).toHaveBeenCalledTimes(2));
  });
});

describe("BriefScreen — navigation d'un BriefItem", () => {
  it("sans onOpen : cartes non interactives", async () => {
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Item A");
    expect(screen.queryByRole("button", { name: /Item A/ })).not.toBeInTheDocument();
  });

  it("avec onOpen : activation souris et clavier (Entrée)", async () => {
    const user = userEvent.setup();
    const onOpenItem = vi.fn();
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenItem={onOpenItem} onOpenAuth={() => {}} />);
    await screen.findByText("Item A");

    const cardA = screen.getByRole("button", { name: /Item A/ });
    await user.click(cardA);
    expect(onOpenItem).toHaveBeenCalledWith(itemA);

    cardA.focus();
    await user.keyboard("{Enter}");
    expect(onOpenItem).toHaveBeenCalledTimes(2);
  });
});

describe("BriefScreen — hotfix 401 : session Auth requise avant toute lecture V3", () => {
  it("sans session : 0 lecture réseau V3, CTA Se connecter", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    const onOpenAuth = vi.fn();
    const user = userEvent.setup();
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={onOpenAuth} />);

    expect(await screen.findByText("Connexion requise")).toBeInTheDocument();
    expect(readBriefMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });

  it("authentifié : readBrief s'exécute normalement", async () => {
    readBriefMock.mockResolvedValue({ ok: true, value: briefFixture() });
    render(<BriefScreen projectId="p1" onBack={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Item A");
    expect(readBriefMock).toHaveBeenCalledTimes(1);
  });
});
