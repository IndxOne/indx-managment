import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { AggregatedActionsScreen } from "./AggregatedActionsScreen";

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

describe("AggregatedActionsScreen", () => {
  it("affiche le nom de l'espace, son badge de type et le statut de l'action", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action()] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };

    render(
      <StoreProvider initialState={state}>
        <AggregatedActionsScreen title="Aujourd'hui" includeLabels={["today"]} emptyDescription="Rien." />
      </StoreProvider>
    );

    expect(screen.getByText("Relancer le prestataire")).toBeInTheDocument();
    expect(screen.getByText("RUN")).toBeInTheDocument();
    expect(screen.getByText(/Suivi quotidien/)).toBeInTheDocument();
  });

  it("état vide quand rien à afficher", () => {
    render(
      <StoreProvider>
        <AggregatedActionsScreen title="Aujourd'hui" includeLabels={["today"]} emptyDescription="Rien à voir." />
      </StoreProvider>
    );
    expect(screen.getByText("Rien à afficher")).toBeInTheDocument();
    expect(screen.getByText("Rien à voir.")).toBeInTheDocument();
  });
});
