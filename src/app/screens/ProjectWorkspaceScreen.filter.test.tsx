import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import type { AppState } from "../adapters/store-context";
import { TemporaryStoreProvider } from "../adapters/temporary-store";
import { ProjectWorkspaceScreen } from "./ProjectWorkspaceScreen";

const workspace: Workspace = {
  id: "project-1",
  name: "Refonte produit",
  kind: "project",
  approach: "project_amoa",
  collaborationMode: "team",
  presetVersion: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function action(id: string, title: string, assigneeIds: string[]): Action {
  return {
    id,
    workspaceId: workspace.id,
    title,
    status: "todo",
    priority: "normal",
    itemType: "task",
    phaseId: "cadrage",
    schedule: { granularity: "day", value: todayInTimeZone("UTC") },
    assigneeIds,
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function renderProject() {
  const state: AppState = {
    workspaces: [workspace],
    actionsByWorkspace: {
      [workspace.id]: [
        action("koffi-action", "Préparer les ateliers", ["koffi"]),
        action("alice-action", "Valider le budget", ["alice"]),
        action("unassigned-action", "Documenter les risques", []),
      ],
    },
    recurrenceRulesByWorkspace: {},
    carnetNotes: [],
    membersByWorkspace: {
      [workspace.id]: [
        { id: "koffi", workspaceId: workspace.id, displayName: "Koffi", active: true, createdAt: "x", updatedAt: "x" },
        { id: "alice", workspaceId: workspace.id, displayName: "Alice", active: true, createdAt: "x", updatedAt: "x" },
        { id: "old", workspaceId: workspace.id, displayName: "Ancien", active: false, createdAt: "x", updatedAt: "x" },
      ],
    },
  };

  render(
    <AnnouncerProvider>
      <TemporaryStoreProvider initialState={state}>
        <ProjectWorkspaceScreen
          workspace={workspace}
          timezone="UTC"
          onOpenSettings={() => {}}
          onNavigateToWorkspace={() => {}}
        />
      </TemporaryStoreProvider>
    </AnnouncerProvider>
  );
}

async function selectAssignee(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Filtres/ }));
  await user.click(screen.getByRole("radio", { name }));
  await user.click(screen.getByRole("button", { name: "Appliquer" }));
  return user;
}

describe("ProjectWorkspaceScreen — filtre Responsable (Lot 8.1)", () => {
  it("Tous conserve toutes les actions de la vue Columns", async () => {
    renderProject();
    const user = await selectAssignee("Koffi");
    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("radio", { name: "Tous" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.getByText("Préparer les ateliers")).toBeInTheDocument();
    expect(screen.getByText("Valider le budget")).toBeInTheDocument();
    expect(screen.getByText("Documenter les risques")).toBeInTheDocument();
  });

  it("un membre ne conserve que ses actions dans la vue Columns", async () => {
    renderProject();
    await selectAssignee("Koffi");

    expect(screen.getByText("Préparer les ateliers")).toBeInTheDocument();
    expect(screen.queryByText("Valider le budget")).not.toBeInTheDocument();
    expect(screen.queryByText("Documenter les risques")).not.toBeInTheDocument();
  });

  it("Non assigné ne conserve que les actions sans responsable dans la vue Columns", async () => {
    renderProject();
    await selectAssignee("Non assigné");

    expect(screen.getByText("Documenter les risques")).toBeInTheDocument();
    expect(screen.queryByText("Préparer les ateliers")).not.toBeInTheDocument();
    expect(screen.queryByText("Valider le budget")).not.toBeInTheDocument();
  });

  it("applique le filtre membre dans la vue Semaine", async () => {
    renderProject();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Par semaine" }));
    await selectAssignee("Alice");

    const week = screen.getByRole("region", { name: "Cette semaine" });
    expect(within(week).getByText("Valider le budget")).toBeInTheDocument();
    expect(screen.queryByText("Préparer les ateliers")).not.toBeInTheDocument();
    expect(screen.queryByText("Documenter les risques")).not.toBeInTheDocument();
  });

  it("applique Non assigné dans la vue Semaine", async () => {
    renderProject();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Par semaine" }));
    await selectAssignee("Non assigné");

    expect(screen.getByText("Documenter les risques")).toBeInTheDocument();
    expect(screen.queryByText("Préparer les ateliers")).not.toBeInTheDocument();
    expect(screen.queryByText("Valider le budget")).not.toBeInTheDocument();
  });
});
