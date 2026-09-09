import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ActionsByStatusScreen } from "./ActionsByStatusScreen";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
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

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Préparer le comité",
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

function renderScreen(state: AppState, overrides: Partial<Parameters<typeof ActionsByStatusScreen>[0]> = {}) {
  return render(
    <AnnouncerProvider>
      <StoreProvider initialState={state}>
        <ActionsByStatusScreen
          status="todo"
          timezone="Europe/Paris"
          onBack={vi.fn()}
          onNavigateToWorkspace={vi.fn()}
          {...overrides}
        />
      </StoreProvider>
    </AnnouncerProvider>
  );
}

describe("ActionsByStatusScreen", () => {
  it("liste uniquement les actions du statut demandé, tous espaces confondus", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [
          action({ id: "a1", status: "todo" }),
          action({ id: "a2", title: "Terminée", status: "done" }),
        ],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    renderScreen(state);

    expect(screen.getByText("Préparer le comité")).toBeInTheDocument();
    expect(screen.queryByText("Terminée")).not.toBeInTheDocument();
  });

  it("le bouton retour appelle onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action()] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    renderScreen(state, { onBack });

    await user.click(screen.getByRole("button", { name: "Retour au Hub" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("état vide quand aucune action dans ce statut", () => {
    renderScreen({ workspaces: [], actionsByWorkspace: {}, recurrenceRulesByWorkspace: {}, carnetNotes: [] });
    expect(screen.getByText("Aucune action")).toBeInTheDocument();
  });
});
