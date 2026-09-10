import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AnnouncerProvider } from "../a11y/announcer";
import type { AppState } from "../adapters/store-context";
import { TemporaryStoreProvider } from "../adapters/temporary-store";
import { ProjectWorkspaceScreen } from "./ProjectWorkspaceScreen";

function stateWithWorkspace(): AppState {
  return {
    workspaces: [
      {
        id: "w1",
        name: "Pilotage équipe",
        kind: "project",
        approach: "management",
        collaborationMode: "solo",
        presetVersion: 1,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    actionsByWorkspace: {},
    recurrenceRulesByWorkspace: {},
    carnetNotes: [],
  };
}

describe("ProjectWorkspaceScreen — approche sans phaseTemplate", () => {
  it("propose toujours d'ajouter une action (management n'a pas de phases)", async () => {
    render(
      <AnnouncerProvider>
        <TemporaryStoreProvider initialState={stateWithWorkspace()}>
          <ProjectWorkspaceScreen
            workspace={stateWithWorkspace().workspaces[0]!}
            timezone="Europe/Paris"
            onOpenSettings={() => {}}
            onNavigateToWorkspace={() => {}}
          />
        </TemporaryStoreProvider>
      </AnnouncerProvider>
    );

    expect(await screen.findByPlaceholderText("Ajouter une action…")).toBeInTheDocument();
  });

  it("une action ajoutée sans échéance reste visible (finding Codex PR #28)", async () => {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <TemporaryStoreProvider initialState={stateWithWorkspace()}>
          <ProjectWorkspaceScreen
            workspace={stateWithWorkspace().workspaces[0]!}
            timezone="Europe/Paris"
            onOpenSettings={() => {}}
            onNavigateToWorkspace={() => {}}
          />
        </TemporaryStoreProvider>
      </AnnouncerProvider>
    );

    await user.type(await screen.findByPlaceholderText("Ajouter une action…"), "Cadrer le périmètre{Enter}");

    expect(await screen.findByText("Cadrer le périmètre")).toBeInTheDocument();
  });

  it("ne propose pas de bascule vers une vue Phases vide (source de confusion sinon)", async () => {
    render(
      <AnnouncerProvider>
        <TemporaryStoreProvider initialState={stateWithWorkspace()}>
          <ProjectWorkspaceScreen
            workspace={stateWithWorkspace().workspaces[0]!}
            timezone="Europe/Paris"
            onOpenSettings={() => {}}
            onNavigateToWorkspace={() => {}}
          />
        </TemporaryStoreProvider>
      </AnnouncerProvider>
    );

    await screen.findByPlaceholderText("Ajouter une action…");
    expect(screen.queryByRole("button", { name: "Vue phases" })).not.toBeInTheDocument();
  });
});

function stateWithPhasedWorkspace(): AppState {
  return {
    workspaces: [
      {
        id: "w2",
        name: "Migration ERP",
        kind: "project",
        approach: "project_amoa",
        collaborationMode: "solo",
        presetVersion: 1,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    actionsByWorkspace: {},
    recurrenceRulesByWorkspace: {},
    carnetNotes: [],
  };
}

describe("ProjectWorkspaceScreen — approche avec phases", () => {
  it("une action ajoutée depuis la vue Semaine reste visible en vue Phases (rattachée à la 1ère phase)", async () => {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <TemporaryStoreProvider initialState={stateWithPhasedWorkspace()}>
          <ProjectWorkspaceScreen
            workspace={stateWithPhasedWorkspace().workspaces[0]!}
            timezone="Europe/Paris"
            onOpenSettings={() => {}}
            onNavigateToWorkspace={() => {}}
          />
        </TemporaryStoreProvider>
      </AnnouncerProvider>
    );

    await user.click(await screen.findByRole("button", { name: "Vue semaine" }));
    await user.type(await screen.findByPlaceholderText("Ajouter une action…"), "Lister les besoins{Enter}");
    expect(await screen.findByText("Lister les besoins")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vue phases" }));
    expect(await screen.findByText("Lister les besoins")).toBeInTheDocument();
  });
});
