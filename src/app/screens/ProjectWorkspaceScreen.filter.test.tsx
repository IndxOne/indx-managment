import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ProjectWorkspaceScreen } from "./ProjectWorkspaceScreen";

const TZ = "Europe/Paris";
const TODAY = todayInTimeZone(TZ);

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Migration ERP",
    kind: "project",
    approach: "project_amoa",
    collaborationMode: "team",
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

function renderScreen(actions: Action[]) {
  const ws = workspace();
  const state: AppState = {
    workspaces: [ws],
    actionsByWorkspace: { w1: actions },
    recurrenceRulesByWorkspace: { w1: [] },
    carnetNotes: [],
    membersByWorkspace: {
      w1: [
        { id: "m1", workspaceId: "w1", displayName: "Koffi", active: true, createdAt: "x", updatedAt: "x" },
        { id: "m2", workspaceId: "w1", displayName: "Alice", active: false, createdAt: "x", updatedAt: "x" },
      ],
    },
  };
  return render(
    <AnnouncerProvider>
      <StoreProvider initialState={state}>
        <ProjectWorkspaceScreen
          workspace={ws}
          timezone={TZ}
          onOpenSettings={() => {}}
          onNavigateToWorkspace={() => {}}
        />
      </StoreProvider>
    </AnnouncerProvider>
  );
}

describe("ProjectWorkspaceScreen — filtre Responsable (Lot 8.1)", () => {
  it("vue Colonnes : filtrer par membre ne montre que ses actions", async () => {
    const user = userEvent.setup();
    renderScreen([
      action({ id: "a1", title: "Cadrer le besoin", phaseId: "cadrage", assigneeIds: ["m1"] }),
      action({ id: "a2", title: "Rédiger le cahier des charges", phaseId: "cadrage", assigneeIds: [] }),
    ]);

    await screen.findByText("Cadrer le besoin");
    await screen.findByText("Rédiger le cahier des charges");

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("radio", { name: "Koffi" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.getByText("Cadrer le besoin")).toBeInTheDocument();
    expect(screen.queryByText("Rédiger le cahier des charges")).not.toBeInTheDocument();
  });

  it("vue Colonnes : filtrer Non assigné ne montre que les actions sans responsable", async () => {
    const user = userEvent.setup();
    renderScreen([
      action({ id: "a1", title: "Cadrer le besoin", phaseId: "cadrage", assigneeIds: ["m1"] }),
      action({ id: "a2", title: "Rédiger le cahier des charges", phaseId: "cadrage", assigneeIds: [] }),
    ]);

    await screen.findByText("Cadrer le besoin");

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("radio", { name: "Non assigné" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.queryByText("Cadrer le besoin")).not.toBeInTheDocument();
    expect(screen.getByText("Rédiger le cahier des charges")).toBeInTheDocument();
  });

  it("vue Colonnes : Tous réaffiche toutes les actions après un filtre", async () => {
    const user = userEvent.setup();
    renderScreen([
      action({ id: "a1", title: "Cadrer le besoin", phaseId: "cadrage", assigneeIds: ["m1"] }),
      action({ id: "a2", title: "Rédiger le cahier des charges", phaseId: "cadrage", assigneeIds: [] }),
    ]);

    await screen.findByText("Cadrer le besoin");

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("radio", { name: "Koffi" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(screen.queryByText("Rédiger le cahier des charges")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Filtres •/ }));
    await user.click(screen.getByRole("radio", { name: "Tous" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.getByText("Cadrer le besoin")).toBeInTheDocument();
    expect(screen.getByText("Rédiger le cahier des charges")).toBeInTheDocument();
  });

  it("vue Semaine : filtrer par membre s'applique aussi aux actions planifiées cette semaine", async () => {
    const user = userEvent.setup();
    renderScreen([
      action({
        id: "a1",
        title: "Point hebdo",
        schedule: { granularity: "day", value: TODAY },
        assigneeIds: ["m1"],
      }),
      action({
        id: "a2",
        title: "Suivi budget",
        schedule: { granularity: "day", value: TODAY },
        assigneeIds: [],
      }),
    ]);

    await user.click(screen.getByRole("tab", { name: "Par semaine" }));
    await screen.findByText("Point hebdo");
    await screen.findByText("Suivi budget");

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    await user.click(screen.getByRole("radio", { name: "Koffi" }));
    await user.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(screen.getByText("Point hebdo")).toBeInTheDocument();
    expect(screen.queryByText("Suivi budget")).not.toBeInTheDocument();
  });

  it("un membre désactivé déjà assigné reste proposé dans le filtre (étiquette Inactif) sans bloquer l'affichage", async () => {
    const user = userEvent.setup();
    renderScreen([action({ id: "a1", title: "Ancienne tâche", phaseId: "cadrage", assigneeIds: ["m2"] })]);

    await user.click(screen.getByRole("button", { name: /Filtres/ }));
    const radiogroup = screen.getByRole("radiogroup", { name: "Filtrer par responsable" });
    const aliceOption = within(radiogroup).getByRole("radio", { name: /Alice/ });
    expect(aliceOption.closest("label")).toHaveTextContent("Inactif");

    await user.click(aliceOption);
    await user.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(screen.getByText("Ancienne tâche")).toBeInTheDocument();
  });
});
