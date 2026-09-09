import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { HubScreen } from "./HubScreen";

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
    id: overrides.id ?? "a1",
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

describe("HubScreen", () => {
  it("agrège les compteurs par statut et les relances actives, tous espaces confondus", () => {
    const state: AppState = {
      workspaces: [workspace({ id: "w1", kind: "run" }), workspace({ id: "w2", kind: "project", name: "Migration ERP" })],
      actionsByWorkspace: {
        w1: [
          action({ id: "a1", status: "todo" }),
          action({ id: "a2", status: "waiting", waitingReminder: { afterDays: 3, enabled: true, history: [] } }),
        ],
        w2: [action({ id: "a3", workspaceId: "w2", status: "done" })],
      },
      recurrenceRulesByWorkspace: { w1: [], w2: [] },
      carnetNotes: [],
    };

    render(
      <StoreProvider initialState={state}>
        <HubScreen onNavigate={() => {}} onOpenSpaces={() => {}} onOpenStatus={() => {}} />
      </StoreProvider>
    );

    expect(screen.getByRole("heading", { name: "Hub" })).toBeInTheDocument();
    expect(screen.getByText("Actions (3)")).toBeInTheDocument();
    expect(screen.getByText(/Relances actives/)).toBeInTheDocument();
  });

  it("cliquer une tuile de statut navigue vers le détail de ce statut", async () => {
    const user = userEvent.setup();
    const onOpenStatus = vi.fn();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ status: "todo" })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    render(
      <StoreProvider initialState={state}>
        <HubScreen onNavigate={() => {}} onOpenSpaces={() => {}} onOpenStatus={onOpenStatus} />
      </StoreProvider>
    );

    await user.click(screen.getByRole("button", { name: /À faire/ }));
    expect(onOpenStatus).toHaveBeenCalledWith("todo");
  });

  it("cliquer une tuile d'espaces navigue vers la liste des espaces", async () => {
    const user = userEvent.setup();
    const onOpenSpaces = vi.fn();

    render(
      <StoreProvider>
        <HubScreen onNavigate={() => {}} onOpenSpaces={onOpenSpaces} onOpenStatus={() => {}} />
      </StoreProvider>
    );

    await user.click(screen.getByRole("button", { name: /Espaces RUN/ }));
    expect(onOpenSpaces).toHaveBeenCalled();
  });

  it("cliquer la tuile des relances actives navigue vers Rappels", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <StoreProvider>
        <HubScreen onNavigate={onNavigate} onOpenSpaces={() => {}} onOpenStatus={() => {}} />
      </StoreProvider>
    );

    await user.click(screen.getByRole("button", { name: /Relances actives/ }));
    expect(onNavigate).toHaveBeenCalledWith("reminders");
  });
});
