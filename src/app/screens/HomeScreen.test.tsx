import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { addDays } from "../../calendar/iso-week";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import type { BriefItem } from "../../domain/v3/brief/types";
import type { HomeOverviewProjection } from "../../domain/v3/home/types";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ToastProvider } from "../components/Toast";
import { resetAuthStateForTests } from "../hooks/useAuthState";
import { HomeScreen } from "./HomeScreen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => true,
}));

/** Authentifié par défaut : préserve le comportement/assertions existants
 * (hotfix 401 V3, cf. useAuthState.ts) — les tests d'états non authentifiés
 * surchargent `getCurrentAuthUserIdMock` localement. */
const getCurrentAuthUserIdMock = vi.fn(async (): Promise<string | null> => "test-auth-user");
const authStateChangeListeners = new Set<(authUserId: string | null) => void>();
vi.mock("../adapters/supabase/auth", () => ({
  getCurrentAuthUserId: () => getCurrentAuthUserIdMock(),
  onAuthStateChange: (listener: (authUserId: string | null) => void) => {
    authStateChangeListeners.add(listener);
    return () => authStateChangeListeners.delete(listener);
  },
}));

beforeEach(() => {
  resetAuthStateForTests();
  getCurrentAuthUserIdMock.mockReset().mockResolvedValue("test-auth-user");
  authStateChangeListeners.clear();
  readHomeOverviewMock.mockClear();
});
afterEach(() => {
  resetAuthStateForTests();
});

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
  handlers: {
    onOpenWeek?: ReturnType<typeof vi.fn>;
    onOpenBrief?: ReturnType<typeof vi.fn>;
    onOpenProject?: ReturnType<typeof vi.fn>;
    onQuickCreate?: ReturnType<typeof vi.fn>;
    onOpenAuth?: ReturnType<typeof vi.fn>;
  } = {}
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
            onOpenAuth={handlers.onOpenAuth ?? vi.fn()}
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

/**
 * Hotfix production (401 V3, cf. PROJECT_HANDOFF.md) : les lectures
 * `projets_v3_*` échouaient en 401 pour un utilisateur sans session Auth
 * (RLS + `revoke all ... from anon`). Aucune requête V3 ne doit plus partir
 * tant que `useAuthState()` ne confirme pas une session valide.
 */
describe("HomeScreen V3 — hotfix 401 : session Auth requise avant toute lecture V3", () => {
  it("sans session : 0 appel readHomeOverview, aucun message d'erreur, RUN toujours rendu", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    renderHome(emptyState);

    await waitFor(() => expect(screen.getAllByText("Connexion requise").length).toBeGreaterThan(0));
    expect(readHomeOverviewMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // RUN reste indépendant de l'état Auth V3 (store V2 local, aucune requête).
    expect(screen.getByText("Rien à traiter côté RUN pour l'instant.")).toBeInTheDocument();
  });

  it("authentifié : la lecture V3 s'exécute normalement", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState);
    await waitFor(() => expect(readHomeOverviewMock).toHaveBeenCalledTimes(1));
  });

  it("CTA « Se connecter » sur le bloc Aujourd'hui/Mes projets/Mon Brief route vers Connexion", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    const onOpenAuth = vi.fn();
    const user = userEvent.setup();
    renderHome(emptyState, { onOpenAuth });

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Se connecter" }).length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole("button", { name: "Se connecter" })[0]!);
    expect(onOpenAuth).toHaveBeenCalledTimes(1);

    // "Mon Brief" devient lui aussi un CTA de connexion tant que non authentifié.
    await user.click(screen.getByRole("button", { name: /Se connecter pour voir Mon Brief/ }));
    expect(onOpenAuth).toHaveBeenCalledTimes(2);
  });

  it("transition logout -> login reflétée sans rechargement complet : readHomeOverview se déclenche après connexion", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState);

    await waitFor(() => expect(screen.getAllByText("Connexion requise").length).toBeGreaterThan(0));
    expect(readHomeOverviewMock).not.toHaveBeenCalled();

    for (const listener of authStateChangeListeners) listener("test-auth-user");

    await waitFor(() => expect(readHomeOverviewMock).toHaveBeenCalledTimes(1));
  });

  it("transition login -> logout : Home revient à « Connexion requise », aucune nouvelle lecture V3", async () => {
    readHomeOverviewMock.mockResolvedValue({ ok: true, value: overview() });
    renderHome(emptyState);
    await waitFor(() => expect(readHomeOverviewMock).toHaveBeenCalledTimes(1));

    for (const listener of authStateChangeListeners) listener(null);

    await waitFor(() => expect(screen.getAllByText("Connexion requise").length).toBeGreaterThan(0));
    expect(readHomeOverviewMock).toHaveBeenCalledTimes(1);
  });
});
