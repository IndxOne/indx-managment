import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { App } from "../App";
import { useStore } from "./store-context";
import { SupabaseStoreProvider } from "./supabase-store";
import type { ActionRow, WorkspaceRow } from "./supabase/mappers";

/**
 * Reproduit précisément la course corrigée : déplacer une action vers
 * "En attente" PUIS activer une relance dans la même confirmation
 * (MoveActionSheet) déclenchait deux écritures Supabase indépendantes sans
 * garantie d'ordre réseau. Ici on vérifie directement le contrat de fond :
 * la deuxième écriture (relance) n'est jamais envoyée avant que la première
 * (déplacement, qui réécrit la ligne entière) ait abouti — donc elle ne peut
 * plus jamais être écrasée par elle.
 */

const WORKSPACE_ID = "w1";
const ACTION_ID = "a1";

function workspaceRow(): WorkspaceRow {
  return {
    id: WORKSPACE_ID,
    user_hash: "test-hash",
    name: "Suivi quotidien",
    description: null,
    kind: "run",
    approach: "it_ops",
    collaboration_mode: "solo",
    preset_version: 1,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
}

function actionRow(): ActionRow {
  return {
    id: ACTION_ID,
    user_hash: "test-hash",
    workspace_id: WORKSPACE_ID,
    title: "Relancer le prestataire",
    description: null,
    status: "todo",
    priority: "normal",
    item_type: "task",
    phase_id: null,
    schedule: { granularity: "none" },
    assignee_ids: [],
    tags: [],
    source_note_id: null,
    recurrence_rule_id: null,
    waiting_since: null,
    waiting_reminder: null,
    notes: [],
    linked_action_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    completed_at: null,
  };
}

interface RecordedUpdate {
  table: string;
  patch: Record<string, unknown>;
  resolve: () => void;
}

let recordedUpdates: RecordedUpdate[];

function makeMockClient() {
  recordedUpdates = [];

  return {
    from(table: string) {
      return {
        select: () => ({
          order: async () => {
            if (table === "projets_workspaces") return { data: [workspaceRow()], error: null };
            if (table === "projets_actions") return { data: [actionRow()], error: null };
            return { data: [], error: null };
          },
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: () =>
            new Promise((resolve) => {
              recordedUpdates.push({ table, patch, resolve: () => resolve({ error: null }) });
            }),
        }),
      };
    },
  };
}

function makePendingMockClient() {
  let resolveLoad = () => {};
  const loadGate = new Promise<void>((resolve) => {
    resolveLoad = resolve;
  });

  return {
    client: {
      from() {
        return {
          select: () => ({
            order: async () => {
              await loadGate;
              return { data: [], error: null };
            },
            maybeSingle: async () => {
              await loadGate;
              return { data: null, error: null };
            },
          }),
        };
      },
    },
    resolveLoad,
  };
}

vi.mock("./supabase/client", () => ({
  getSupabaseClient: () => mockClientInstance,
  isSupabaseConfigured: () => true,
}));

vi.mock("./supabase/user-hash", () => ({
  getOrCreateUserHash: () => "test-hash",
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- réassigné avant chaque test par makeMockClient()
let mockClientInstance: any;

describe("App — chargement Supabase", () => {
  it("garde la navigation basse interactive pendant l'affichage du skeleton", async () => {
    const user = userEvent.setup();
    const pendingClient = makePendingMockClient();
    mockClientInstance = pendingClient.client;

    render(<App />);

    const loadingLabel = await screen.findByText("Chargement des espaces…");
    expect(loadingLabel.closest('[role="status"]')).toHaveClass("loading-skeleton");
    const weekTab = screen.getByRole("button", { name: "Semaine" });
    await user.click(weekTab);
    expect(weekTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Chargement des espaces…")).toBeInTheDocument();

    await act(async () => {
      pendingClient.resolveLoad();
    });

    expect(await screen.findByRole("heading", { name: "Cette semaine" })).toBeInTheDocument();
  });
});

function TestConsumer() {
  const { state, moveActionEvent, setReminder } = useStore();
  const action = state.actionsByWorkspace[WORKSPACE_ID]?.[0];
  if (!action) return <p>chargement…</p>;
  return (
    <button
      type="button"
      onClick={() => {
        moveActionEvent(WORKSPACE_ID, ACTION_ID, { axis: "status", status: "waiting" });
        setReminder(WORKSPACE_ID, ACTION_ID, 3);
      }}
    >
      go
    </button>
  );
}

function RetryTestConsumer() {
  const { state, moveActionEvent, pendingSyncCount, conflicts } = useStore();
  const action = state.actionsByWorkspace[WORKSPACE_ID]?.[0];
  if (!action) return <p>chargement…</p>;
  return (
    <div>
      <button
        type="button"
        onClick={() => moveActionEvent(WORKSPACE_ID, ACTION_ID, { axis: "status", status: "doing" })}
      >
        move
      </button>
      <p>en attente : {pendingSyncCount}</p>
      {conflicts.map((conflict) => (
        <div key={conflict.key}>
          <p>conflit : {conflict.actionTitle}</p>
          <button type="button" onClick={conflict.onKeepLocal}>
            garder ma version
          </button>
          <button type="button" onClick={conflict.onDiscardLocal}>
            garder celle du serveur
          </button>
        </div>
      ))}
    </div>
  );
}

interface RetryMockClient {
  client: unknown;
  updateCallCount: () => number;
  setUpdateShouldFail: (value: boolean) => void;
  setRemoteUpdatedAt: (value: string) => void;
}

/**
 * Contrairement à `makeMockClient` (écritures qui ne résolvent que sur
 * commande, pour figer une course), ce mock résout immédiatement mais peut
 * échouer sur commande — nécessaire pour simuler une coupure réseau suivie
 * d'une reconnexion (`retryPending`), puis la vérification de conflit
 * (`select("updated_at").eq(...).maybeSingle()`) qui la précède.
 */
function makeRetryMockClient(): RetryMockClient {
  let updateShouldFail = true;
  let remoteUpdatedAt = actionRow().updated_at;
  let updateCallCount = 0;

  const client = {
    from(table: string) {
      return {
        select: () => ({
          order: async () => {
            if (table === "projets_workspaces") return { data: [workspaceRow()], error: null };
            if (table === "projets_actions") return { data: [actionRow()], error: null };
            return { data: [], error: null };
          },
          maybeSingle: async () => ({ data: null, error: null }),
          eq: () => ({
            maybeSingle: async () => ({ data: { updated_at: remoteUpdatedAt }, error: null }),
          }),
        }),
        update: () => ({
          eq: async () => {
            updateCallCount += 1;
            return { error: updateShouldFail ? new Error("réseau indisponible") : null };
          },
        }),
      };
    },
  };

  return {
    client,
    updateCallCount: () => updateCallCount,
    setUpdateShouldFail: (value) => {
      updateShouldFail = value;
    },
    setRemoteUpdatedAt: (value) => {
      remoteUpdatedAt = value;
    },
  };
}

describe("SupabaseStoreProvider — file de retry et conflit à la reconnexion", () => {
  it("retente une mutation échouée à la reconnexion et l'efface de la file une fois confirmée", async () => {
    const retryClient = makeRetryMockClient();
    mockClientInstance = retryClient.client;

    render(
      <SupabaseStoreProvider>
        <RetryTestConsumer />
      </SupabaseStoreProvider>
    );

    const button = await screen.findByRole("button", { name: "move" });
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(retryClient.updateCallCount()).toBe(1);
    expect(screen.getByText("en attente : 1")).toBeInTheDocument();

    retryClient.setUpdateShouldFail(false);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(retryClient.updateCallCount()).toBe(2);
    expect(screen.getByText("en attente : 0")).toBeInTheDocument();
  });

  it("n'écrase jamais silencieusement une version plus récente arrivée pendant la coupure", async () => {
    const retryClient = makeRetryMockClient();
    mockClientInstance = retryClient.client;

    render(
      <SupabaseStoreProvider>
        <RetryTestConsumer />
      </SupabaseStoreProvider>
    );

    const button = await screen.findByRole("button", { name: "move" });
    await act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(retryClient.updateCallCount()).toBe(1);

    // Pendant la coupure, une autre source a modifié l'action côté serveur.
    retryClient.setRemoteUpdatedAt("2026-09-02T00:00:00.000Z");
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Pas de deuxième tentative d'écriture : le conflit bloque le retry aveugle.
    expect(retryClient.updateCallCount()).toBe(1);
    expect(screen.getByText("en attente : 0")).toBeInTheDocument();
    expect(screen.getByText(/conflit : /)).toBeInTheDocument();

    retryClient.setUpdateShouldFail(false);
    await act(async () => {
      screen.getByRole("button", { name: "garder ma version" }).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(retryClient.updateCallCount()).toBe(2);
    expect(screen.queryByText(/conflit : /)).not.toBeInTheDocument();
  });
});

function DescriptionTestConsumer() {
  const { state, editWorkspaceDescription } = useStore();
  const workspace = state.workspaces[0];
  if (!workspace) return <p>chargement…</p>;
  return (
    <button
      type="button"
      onClick={() => {
        editWorkspaceDescription(WORKSPACE_ID, "Première version");
        editWorkspaceDescription(WORKSPACE_ID, "Deuxième version");
      }}
    >
      go
    </button>
  );
}

describe("SupabaseStoreProvider — course déplacement + relance", () => {
  beforeEach(() => {
    mockClientInstance = makeMockClient();
  });

  it("n'envoie l'écriture de la relance qu'une fois celle du déplacement aboutie", async () => {
    render(
      <SupabaseStoreProvider>
        <TestConsumer />
      </SupabaseStoreProvider>
    );

    const button = await screen.findByRole("button", { name: "go" });
    await act(async () => {
      button.click();
    });

    // Le clic déclenche move + setReminder dans le même tick : seule
    // l'écriture du déplacement doit être partie vers Supabase.
    expect(recordedUpdates).toHaveLength(1);
    const moveUpdate = recordedUpdates[0]!;
    expect(moveUpdate.patch).toMatchObject({ status: "waiting" });

    // Le déplacement aboutit...
    await act(async () => {
      moveUpdate.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // ...ce n'est qu'à ce moment que l'écriture de la relance part à son tour.
    expect(recordedUpdates).toHaveLength(2);
    expect(recordedUpdates[1]!.patch).toMatchObject({ waiting_reminder: { afterDays: 3, enabled: true } });
  });
});

describe("SupabaseStoreProvider — course sur deux sauvegardes rapprochées des notes de projet", () => {
  beforeEach(() => {
    mockClientInstance = makeMockClient();
  });

  it("n'envoie la deuxième sauvegarde qu'une fois la première aboutie (jamais en parallèle)", async () => {
    render(
      <SupabaseStoreProvider>
        <DescriptionTestConsumer />
      </SupabaseStoreProvider>
    );

    const button = await screen.findByRole("button", { name: "go" });
    await act(async () => {
      button.click();
    });

    // Les deux appels partent dans le même tick : seule la première écriture
    // doit être en vol vers Supabase, sinon leur ordre d'arrivée réseau
    // n'est plus garanti et la plus récente peut être écrasée par l'autre.
    expect(recordedUpdates).toHaveLength(1);
    const firstUpdate = recordedUpdates[0]!;
    expect(firstUpdate.patch).toMatchObject({ description: "Première version" });

    await act(async () => {
      firstUpdate.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(recordedUpdates).toHaveLength(2);
    expect(recordedUpdates[1]!.patch).toMatchObject({ description: "Deuxième version" });
  });
});
