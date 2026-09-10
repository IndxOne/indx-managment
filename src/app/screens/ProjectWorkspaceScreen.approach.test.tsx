import { render, screen } from "@testing-library/react";
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
});
