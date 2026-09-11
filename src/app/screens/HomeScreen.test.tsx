import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { addDays } from "../../calendar/iso-week";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { HomeScreen } from "./HomeScreen";

const TZ = "Europe/Paris";
const TODAY = todayInTimeZone(TZ);
const YESTERDAY = addDays(TODAY, -1);
const TOMORROW = addDays(TODAY, 1);

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

function renderHome(state: AppState, onOpenWeek = vi.fn()) {
  return render(
    <AnnouncerProvider>
      <StoreProvider initialState={state}>
        <HomeScreen timezone={TZ} onNavigateToWorkspace={() => {}} onOpenWeek={onOpenWeek} />
      </StoreProvider>
    </AnnouncerProvider>
  );
}

describe("HomeScreen — sections et regroupement (Lot 7)", () => {
  it("classe une action du jour dans « Aujourd'hui »", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche du jour", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByRole("heading", { name: "Aujourd'hui" })).toBeInTheDocument();
    expect(screen.getByText("Tâche du jour")).toBeInTheDocument();
  });

  it("classe une action en retard (non bloquée) dans « En retard »", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche en retard", schedule: { granularity: "day", value: YESTERDAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByRole("heading", { name: "En retard" })).toBeInTheDocument();
    expect(screen.getByText("Tâche en retard")).toBeInTheDocument();
  });

  it("classe une action bloquée (sans retard) dans « Bloqué »", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ title: "Tâche bloquée", status: "blocked", schedule: { granularity: "day", value: TODAY } })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByRole("heading", { name: "Bloqué" })).toBeInTheDocument();
    expect(screen.getByText("Tâche bloquée")).toBeInTheDocument();
  });

  it("une action en retard ET bloquée n'apparaît qu'une fois, dans « En retard » (jamais dupliquée dans « Bloqué »)", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ title: "Tâche critique", status: "blocked", schedule: { granularity: "day", value: YESTERDAY } })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getAllByText("Tâche critique")).toHaveLength(1);
    // Le statut "Bloqué" reste visible comme indicateur sur la carte, dans la section "En retard".
    const overdueSection = screen.getByRole("heading", { name: "En retard" }).closest("section")!;
    expect(overdueSection).toHaveTextContent("Bloqué");
  });

  it("exclut toujours les actions terminées, même en retard ou bloquées", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [
          action({ id: "a1", title: "Terminée en retard", status: "done", schedule: { granularity: "day", value: YESTERDAY } }),
          action({ id: "a2", title: "Terminée aujourd'hui", status: "done", schedule: { granularity: "day", value: TODAY } }),
        ],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.queryByText("Terminée en retard")).not.toBeInTheDocument();
    expect(screen.queryByText("Terminée aujourd'hui")).not.toBeInTheDocument();
    expect(screen.getByText("Rien à afficher")).toBeInTheDocument();
  });

  it("classe demain dans l'aperçu « Cette semaine »", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche de demain", schedule: { granularity: "day", value: TOMORROW } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByRole("heading", { name: "Cette semaine" })).toBeInTheDocument();
    expect(screen.getByText("Tâche de demain")).toBeInTheDocument();
  });

  it("le bouton « Voir la semaine complète » appelle onOpenWeek", async () => {
    const user = userEvent.setup();
    const onOpenWeek = vi.fn();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state, onOpenWeek);
    await user.click(screen.getByRole("button", { name: "Voir la semaine complète" }));
    expect(onOpenWeek).toHaveBeenCalledTimes(1);
  });

  it("ouvre ActionDetailSheet au clic sur une carte", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ title: "Ouvrir le détail", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    await user.click(screen.getByRole("button", { name: /^Ouvrir le détail/ }));
    expect(screen.getByRole("dialog", { name: "Ouvrir le détail" })).toBeInTheDocument();
  });

  it("état vide global quand rien n'est urgent", () => {
    renderHome({
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    });
    expect(screen.getByText("Rien à afficher")).toBeInTheDocument();
    expect(screen.getByText("Aucune action urgente pour l'instant.")).toBeInTheDocument();
  });

  it("affiche un état vide explicite par section quand au moins une autre section a du contenu", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [action({ title: "Seule tâche", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByText("Aucune action en retard.")).toBeInTheDocument();
    expect(screen.getByText("Aucune action bloquée.")).toBeInTheDocument();
    expect(screen.getByText("Rien de prévu plus tard cette semaine.")).toBeInTheDocument();
  });
});
