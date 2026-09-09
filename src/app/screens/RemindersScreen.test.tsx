import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ActionsByStatusScreen } from "./ActionsByStatusScreen";
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

  it("activer une relance en déplaçant une action vers En attente la fait apparaître dans Rappels (onSetReminder câblé)", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ id: "a1", title: "Nouvelle tâche", status: "todo", waitingReminder: undefined })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    // Même StoreProvider pour les deux écrans : le déplacement effectué
    // depuis ActionsByStatusScreen doit se refléter dans RemindersScreen,
    // preuve que setReminder est bien appelé avec le bon workspaceId.
    render(
      <AnnouncerProvider>
        <StoreProvider initialState={state}>
          <ActionsByStatusScreen status="todo" timezone="Europe/Paris" onBack={() => {}} onNavigateToWorkspace={vi.fn()} />
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={vi.fn()} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );

    expect(screen.getByText("Aucune relance active")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Actions pour "Nouvelle tâche"/ }));
    await user.click(screen.getByRole("button", { name: /^Déplacer/ }));
    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "En attente" }));
    await user.click(screen.getByLabelText("Activer une relance automatique"));
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(screen.queryByText("Aucune relance active")).not.toBeInTheDocument();
    expect(screen.getByText(/Relance après 3 j/)).toBeInTheDocument();
  });

  it("le clic sur le badge d'espace navigue vers l'espace d'origine", async () => {
    const user = userEvent.setup();
    const onNavigateToWorkspace = vi.fn();
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
          <RemindersScreen timezone="Europe/Paris" onNavigateToWorkspace={onNavigateToWorkspace} onNavigate={() => {}} />
        </StoreProvider>
      </AnnouncerProvider>
    );

    await user.click(screen.getByRole("button", { name: "RUN" }));
    expect(onNavigateToWorkspace).toHaveBeenCalledWith("w1");
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
