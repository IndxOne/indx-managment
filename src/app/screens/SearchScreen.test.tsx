import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { SearchScreen } from "./SearchScreen";

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
    title: "Relancer le prestataire",
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

function renderScreen(state: AppState) {
  return render(
    <AnnouncerProvider>
      <StoreProvider initialState={state}>
        <SearchScreen timezone="Europe/Paris" onNavigate={() => {}} onNavigateToWorkspace={vi.fn()} />
      </StoreProvider>
    </AnnouncerProvider>
  );
}

describe("SearchScreen", () => {
  it("invite à saisir une recherche tant que le champ est vide", () => {
    renderScreen({ workspaces: [], actionsByWorkspace: {}, recurrenceRulesByWorkspace: {}, carnetNotes: [] });
    expect(screen.getByText(/Tapez un titre pour retrouver une action/)).toBeInTheDocument();
  });

  it("filtre les actions par titre, insensible à la casse, tous espaces confondus", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ id: "a1", title: "Relancer le prestataire" }), action({ id: "a2", title: "Préparer le comité" })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    renderScreen(state);

    await user.type(screen.getByLabelText("Rechercher une action"), "relan");
    expect(screen.getByText("Relancer le prestataire")).toBeInTheDocument();
    expect(screen.queryByText("Préparer le comité")).not.toBeInTheDocument();
  });

  it("affiche un état vide quand aucune action ne correspond", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action()] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    renderScreen(state);

    await user.type(screen.getByLabelText("Rechercher une action"), "xyz");
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });
});
