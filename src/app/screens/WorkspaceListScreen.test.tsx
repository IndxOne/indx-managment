import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ToastProvider } from "../components/Toast";
import { WorkspaceListScreen } from "./WorkspaceListScreen";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Support quotidien",
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
    title: "Tâche",
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

function renderScreen(workspaces: Workspace[], actionsByWorkspace: Record<string, Action[]>) {
  const state: AppState = {
    workspaces,
    actionsByWorkspace,
    recurrenceRulesByWorkspace: Object.fromEntries(workspaces.map((w) => [w.id, []])),
    carnetNotes: [],
  };
  return render(
    <AnnouncerProvider>
      <ToastProvider>
        <StoreProvider initialState={state}>
          <WorkspaceListScreen timezone="Europe/Paris" onSelect={vi.fn()} onCreate={vi.fn()} />
        </StoreProvider>
      </ToastProvider>
    </AnnouncerProvider>
  );
}

describe("WorkspaceListScreen — filtres projets (§15, Lot C)", () => {
  it("filtre par statut dérivé (Actif/Terminé)", async () => {
    const user = userEvent.setup();
    renderScreen(
      [workspace({ id: "w1", name: "En cours" }), workspace({ id: "w2", name: "Bouclé", kind: "project" })],
      {
        w1: [action({ id: "a1", workspaceId: "w1" })],
        w2: [action({ id: "a2", workspaceId: "w2", status: "done" })],
      }
    );

    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Bouclé")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("checkbox", { name: "Terminé" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.queryByText("En cours")).not.toBeInTheDocument();
    expect(screen.getByText("Bouclé")).toBeInTheDocument();
  });

  it("filtre par approche métier", async () => {
    const user = userEvent.setup();
    renderScreen(
      [
        workspace({ id: "w1", name: "Support quotidien", approach: "it_ops" }),
        workspace({ id: "w2", name: "Cadrage AMOA", kind: "project", approach: "project_amoa" }),
      ],
      { w1: [action({ id: "a1", workspaceId: "w1" })], w2: [action({ id: "a2", workspaceId: "w2" })] }
    );

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("checkbox", { name: "Projet / AMOA" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.queryByText("Support quotidien")).not.toBeInTheDocument();
    expect(screen.getByText("Cadrage AMOA")).toBeInTheDocument();
  });

  it("aucun résultat après filtrage : propose de réinitialiser", async () => {
    const user = userEvent.setup();
    renderScreen([workspace({ id: "w1", name: "En cours" })], { w1: [action({ id: "a1", workspaceId: "w1" })] });

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("checkbox", { name: "Terminé" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.getByText("Aucun projet ne correspond aux filtres")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });
});
