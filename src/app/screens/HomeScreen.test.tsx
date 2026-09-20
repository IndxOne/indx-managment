import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { addDays } from "../../calendar/iso-week";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import type { BriefItem } from "../../domain/v3/brief/types";
import type { HomeOverviewProjection } from "../../domain/v3/home/types";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ToastProvider } from "../components/Toast";
import { HomeScreen } from "./HomeScreen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => true,
}));

const readHomeOverviewMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/home-overview-reader", () => ({
  readHomeOverview: (...args: unknown[]) => readHomeOverviewMock(...args),
}));

const TZ = "Europe/Paris";
const TODAY = todayInTimeZone(TZ);
const YESTERDAY = addDays(TODAY, -1);
const NOW = "2026-09-20T08:00:00.000Z";

function runWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Suivi quotidien",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function projectWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return runWorkspace({ id: "p1-v2", name: "Ancien projet V2", kind: "project", approach: "project_amoa", ...overrides });
}

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Action",
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function briefItem(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "work_item:wi1",
    sourceType: "work_item",
    sourceId: "wi1",
    projectId: "p1",
    severity: "blocking",
    title: "Configurer VPN",
    reason: "Aucun responsable assigné",
    status: "to_scope",
    ...overrides,
  };
}

function overview(overrides: Partial<HomeOverviewProjection> = {}): HomeOverviewProjection {
  return { generatedAt: NOW, attentionItems: [], projects: [], ...overrides };
}

function renderHome(
  state: AppState,
  handlers: { onOpenWeek?: ReturnType<typeof vi.fn>; onOpenBrief?: ReturnType<typeof vi.fn>; onOpenProject?: ReturnType<typeof vi.fn>; onQuickCreate?: ReturnType<typeof vi.fn> } = {}
) {
  return render(
    <AnnouncerProvider>
      <ToastProvider>
        <StoreProvider initialState={state}>
          <HomeScreen
            timezone={TZ}
            onNavigateToWorkspace={() => {}}
            onOpenWeek={handlers.onOpenWeek ?? vi.fn()}
            onOpenBrief={handlers.onOpenBrief ?? vi.fn()}
            onOpenProject={handlers.onOpenProject ?? vi.fn()}
            onQuickCreate={handlers.onQuickCreate ?? vi.fn()}
          />
        </StoreProvider>
      </ToastProvider>
    </AnnouncerProvider>
  );
}

const emptyState: AppState = {
  workspaces: [runWorkspace()],
  actionsByWorkspace: { w1: [] },
  recurrenceRulesByWorkspace: { w1: [] },
  carnetNotes: [],
};

describe("HomeScreen V3 — ordre mobile des blocs", () => {
  it("Aujourd'hui, Mes projets, Mon Brief, RUN, dans cet ordre exact", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState);
    await waitFor(() => expect(screen.getByText("Rien ne nécessite ton attention actuellement.")).toBeInTheDocument());
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Aujourd'hui", "Mes projets", "Mon Brief", "RUN"]);
  });
});

describe("HomeScreen V3 — Bloc Aujourd'hui (priorité aux données V3)", () => {
  it("affiche la synthèse et les items d'attention venus de readHomeOverview, jamais un recalcul V2", async () => {
    readHomeOverviewMock.mockResolvedValue({
      ok: true,
      value: overview({ attentionItems: [briefItem({ title: "Item critique V3" })] }),
    });
    renderHome(emptyState);
    await waitFor(() => expect(screen.getByText("1 élément nécessite ton attention.")).toBeInTheDocument());
    expect(screen.getByText("Item critique V3")).toBeInTheDocument();
  });

  it("clic sur un item d'attention -> onOpenProject avec le focus exact", async () => {
    const user = userEvent.setup();
    const onOpenProject = vi.fn();
    const item = briefItem({ projectId: "p42", sourceType: "risk", sourceId: "r1", title: "Risque critique" });
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview({ attentionItems: [item] }) });
    renderHome(emptyState, { onOpenProject });
    await waitFor(() => screen.getByText("Risque critique"));
    await user.click(screen.getByRole("button", { name: /Risque critique/ }));
    expect(onOpenProject).toHaveBeenCalledWith("p42", { focusType: "risk", focusId: "r1" });
  });
});

describe("HomeScreen V3 — Bloc Mes projets", () => {
  it("affiche uniquement des Project V3, jamais un Workspace V2 kind=project présent dans le store", async () => {
    readHomeOverviewMock.mockResolvedValue({
      ok: true,
      value: overview({ projects: [{ id: "p1", name: "Migration M365 (V3)", status: "on_track", criticality: "high", needsAttention: false }] }),
    });
    renderHome({ ...emptyState, workspaces: [runWorkspace(), projectWorkspace()] });
    await waitFor(() => expect(screen.getByText("Migration M365 (V3)")).toBeInTheDocument());
    expect(screen.queryByText("Ancien projet V2")).not.toBeInTheDocument();
  });

  it("clic sur une carte projet -> onOpenProject(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenProject = vi.fn();
    readHomeOverviewMock.mockResolvedValue({
      ok: true,
      value: overview({ projects: [{ id: "p7", name: "AMOA RH", status: "at_risk", criticality: "medium", needsAttention: false }] }),
    });
    renderHome(emptyState, { onOpenProject });
    await waitFor(() => screen.getByText("AMOA RH"));
    await user.click(screen.getByRole("button", { name: /AMOA RH/ }));
    expect(onOpenProject).toHaveBeenCalledWith("p7");
  });

  it("0 projet -> état vide informatif, jamais un lien de création (UX-6 non construit)", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState);
    await waitFor(() => expect(screen.getByText("Aucun projet actif pour l'instant.")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Créer/ })).not.toBeInTheDocument();
  });
});

describe("HomeScreen V3 — Bloc Mon Brief", () => {
  it("CTA « Voir Mon Brief » avec horodatage, sans badge chiffré", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview({ generatedAt: "2026-09-20T14:30:00.000Z" }) });
    renderHome(emptyState);
    await waitFor(() => expect(screen.getByText("Voir Mon Brief")).toBeInTheDocument());
    expect(screen.getByText(/Mis à jour à/)).toBeInTheDocument();
  });

  it("clic -> onOpenBrief", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState, { onOpenBrief });
    await waitFor(() => screen.getByText("Voir Mon Brief"));
    await user.click(screen.getByRole("button", { name: /Voir Mon Brief/ }));
    expect(onOpenBrief).toHaveBeenCalledTimes(1);
  });
});

describe("HomeScreen V3 — Bloc RUN (V2, store existant, aucune requête)", () => {
  it("reste fonctionnel même quand V3 échoue (erreur partielle, jamais tout Home)", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: false, error: { kind: "persistence", code: "unknown", message: "boom" } });
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche RUN", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    await waitFor(() => expect(screen.getAllByText("Impossible de charger tes projets.").length).toBeGreaterThan(0));
    expect(screen.getByText("Tâche RUN")).toBeInTheDocument();
  });

  it("un Project V2 (kind=project) n'apparaît jamais dans RUN", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    const state: AppState = {
      workspaces: [runWorkspace(), projectWorkspace()],
      actionsByWorkspace: {
        w1: [action({ id: "a1", title: "Tâche RUN", schedule: { granularity: "day", value: TODAY } })],
        "p1-v2": [action({ id: "a2", workspaceId: "p1-v2", title: "Tâche projet V2", schedule: { granularity: "day", value: TODAY } })],
      },
      recurrenceRulesByWorkspace: { w1: [], "p1-v2": [] },
      carnetNotes: [],
    };
    renderHome(state);
    await waitFor(() => screen.getByText("Tâche RUN"));
    expect(screen.queryByText("Tâche projet V2")).not.toBeInTheDocument();
  });

  it("état vide RUN -> message explicite + action suivante concrète", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    const onQuickCreate = vi.fn();
    const user = userEvent.setup();
    renderHome(emptyState, { onQuickCreate });
    await waitFor(() => expect(screen.getByText("Rien à traiter côté RUN pour l'instant.")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Ajouter une action/ }));
    expect(onQuickCreate).toHaveBeenCalledTimes(1);
  });

  it("priorité immédiate RUN (en retard) toujours traitable", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "En retard", schedule: { granularity: "day", value: YESTERDAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    await waitFor(() => screen.getByText("En retard"));
    expect(screen.getByRole("button", { name: "Traiter" })).toBeInTheDocument();
  });

  it("le bouton « Voir la semaine complète » appelle onOpenWeek", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    const user = userEvent.setup();
    const onOpenWeek = vi.fn();
    renderHome(emptyState, { onOpenWeek });
    await waitFor(() => screen.getByRole("button", { name: "Voir la semaine complète" }));
    await user.click(screen.getByRole("button", { name: "Voir la semaine complète" }));
    expect(onOpenWeek).toHaveBeenCalledTimes(1);
  });
});
