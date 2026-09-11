import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, useStore, type AppState } from "../adapters/temporary-store";
import { ApproachSettingsScreen } from "./ApproachSettingsScreen";

// Comme App.tsx, `workspace` doit être re-dérivé du store à chaque rendu :
// sinon un changement de collaborationMode via setCollaborationMode ne se
// reflète jamais dans le composant (prop figée sur l'objet initial).
function LiveApproachSettingsScreen({ workspaceId }: { workspaceId: string }) {
  const { state } = useStore();
  const workspace = state.workspaces.find((candidate) => candidate.id === workspaceId);
  if (!workspace) return null;
  return <ApproachSettingsScreen workspace={workspace} onDone={() => {}} />;
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Projet test",
    kind: "project",
    approach: "project_amoa",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderScreen(ws: Workspace, extraState: Partial<AppState> = {}) {
  const state: AppState = {
    workspaces: [ws],
    actionsByWorkspace: { w1: [] },
    recurrenceRulesByWorkspace: { w1: [] },
    carnetNotes: [],
    membersByWorkspace: { w1: [] },
    ...extraState,
  };
  return render(
    <AnnouncerProvider>
      <StoreProvider initialState={state}>
        <LiveApproachSettingsScreen workspaceId={ws.id} />
      </StoreProvider>
    </AnnouncerProvider>
  );
}

describe("ApproachSettingsScreen — mode Solo/Équipe (Lot 8B §A)", () => {
  it("en mode Solo, aucune section Membres visible", () => {
    renderScreen(workspace());
    expect(screen.queryByText("Membres")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Solo" })).toBeChecked();
  });

  it("activer Équipe fait apparaître la section Membres", async () => {
    const user = userEvent.setup();
    renderScreen(workspace());
    await user.click(screen.getByRole("radio", { name: "Équipe" }));
    expect(await screen.findByText("Membres")).toBeInTheDocument();
    expect(screen.getByText("Aucun membre pour l'instant.")).toBeInTheDocument();
  });

  it("repasser en Solo masque la section Membres mais ne supprime aucune donnée (store)", async () => {
    const user = userEvent.setup();
    renderScreen(workspace({ collaborationMode: "team" }), {
      membersByWorkspace: {
        w1: [{ id: "m1", workspaceId: "w1", displayName: "Koffi", active: true, createdAt: "x", updatedAt: "x" }],
      },
    });
    expect(screen.getByText("Membres")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Solo" }));
    expect(screen.queryByText("Membres")).not.toBeInTheDocument();
  });
});

describe("ApproachSettingsScreen — gestion des membres (Lot 8B §B)", () => {
  it("ajouter un membre depuis la section Membres", async () => {
    const user = userEvent.setup();
    renderScreen(workspace({ collaborationMode: "team" }));
    await user.click(screen.getByRole("button", { name: "Gérer les membres" }));
    await user.type(screen.getByLabelText("Nom du nouveau membre"), "Koffi");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Koffi")).toBeInTheDocument();
  });
});
