import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { RemindersScreen } from "./RemindersScreen";

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
    status: "waiting",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("RemindersScreen", () => {
  it("liste uniquement les actions en attente avec une relance activée", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [
          action({ id: "a1", waitingReminder: { afterDays: 3, enabled: true, history: [] } }),
          action({ id: "a2", title: "Sans relance", waitingReminder: undefined }),
          action({ id: "a3", title: "Relance désactivée", waitingReminder: { afterDays: 3, enabled: false, history: [] } }),
        ],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    render(
      <AnnouncerProvider>
        <StoreProvider initialState={state}>
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={vi.fn()} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );

    expect(screen.getByText("Relancer le prestataire")).toBeInTheDocument();
    expect(screen.queryByText("Sans relance")).not.toBeInTheDocument();
    expect(screen.queryByText("Relance désactivée")).not.toBeInTheDocument();
  });

  it("affiche l'espace d'origine de chaque relance (vue transversale)", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ waitingReminder: { afterDays: 3, enabled: true, history: [] } })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    render(
      <AnnouncerProvider>
        <StoreProvider initialState={state}>
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={vi.fn()} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );

    expect(screen.getByText(/Suivi quotidien ·/)).toBeInTheDocument();
  });

  it("cycler le statut déplace l'action hors des relances actives", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ waitingReminder: { afterDays: 3, enabled: true, history: [] } })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    render(
      <AnnouncerProvider>
        <StoreProvider initialState={state}>
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={vi.fn()} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );

    await user.click(screen.getByRole("checkbox", { name: /Statut de "Relancer le prestataire"/ }));
    expect(screen.getByText("Aucune relance active")).toBeInTheDocument();
    expect(screen.getByText("Déplacement effectué.")).toBeInTheDocument();
  });

  it("état vide quand aucune relance active", () => {
    render(
      <AnnouncerProvider>
        <StoreProvider>
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={vi.fn()} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );
    expect(screen.getByText("Aucune relance active")).toBeInTheDocument();
  });
});
