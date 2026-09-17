import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import { addDays } from "../../calendar/iso-week";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ToastProvider } from "../components/Toast";
import { HomeScreen } from "./HomeScreen";

const TZ = "Europe/Paris";
const TODAY = todayInTimeZone(TZ);
const YESTERDAY = addDays(TODAY, -1);
const TOMORROW = addDays(TODAY, 1);

function runWorkspace(overrides: Partial<Workspace> = {}): Workspace {
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

function projectWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return runWorkspace({ id: "p1", name: "Refonte CRM", kind: "project", approach: "project_amoa", ...overrides });
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

function renderHome(state: AppState, onOpenWeek = vi.fn(), onQuickCreate = vi.fn()) {
  return render(
    <AnnouncerProvider>
      <ToastProvider>
        <StoreProvider initialState={state}>
          <HomeScreen timezone={TZ} onNavigateToWorkspace={() => {}} onOpenWeek={onOpenWeek} onQuickCreate={onQuickCreate} />
        </StoreProvider>
      </ToastProvider>
    </AnnouncerProvider>
  );
}

describe("HomeScreen — Aujourd'hui (renouveau mobile, Lot A)", () => {
  it("place une action en retard en « Priorité immédiate », jamais dupliquée ailleurs", () => {
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche en retard", schedule: { granularity: "day", value: YESTERDAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByRole("heading", { name: "Priorité immédiate" })).toBeInTheDocument();
    expect(screen.getAllByText("Tâche en retard")).toHaveLength(1);
  });

  it("classe une action RUN du jour (hors priorité immédiate) dans « RUN du jour »", () => {
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: {
        w1: [
          action({ id: "a1", title: "Urgent", schedule: { granularity: "day", value: YESTERDAY } }),
          action({ id: "a2", title: "RUN du jour", schedule: { granularity: "day", value: TODAY } }),
        ],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    const section = screen.getByRole("heading", { name: "RUN du jour" }).closest("section")!;
    expect(section).toHaveTextContent("RUN du jour");
    expect(section).not.toHaveTextContent("Urgent");
  });

  it("classe une tâche PROJET du jour dans « Tâches Projet du jour », séparée du RUN du jour", () => {
    const state: AppState = {
      workspaces: [runWorkspace(), projectWorkspace()],
      actionsByWorkspace: {
        w1: [
          // Absorbe le créneau "Priorité immédiate" (en retard) pour isoler
          // le classement des deux autres actions, du jour, dans leur
          // section respective.
          action({ id: "a0", title: "Urgent", schedule: { granularity: "day", value: YESTERDAY } }),
          action({ id: "a1", title: "Tâche RUN", schedule: { granularity: "day", value: TODAY } }),
        ],
        p1: [action({ id: "a2", workspaceId: "p1", title: "Tâche Projet", schedule: { granularity: "day", value: TODAY } })],
      },
      recurrenceRulesByWorkspace: { w1: [], p1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    const runSection = screen.getByRole("heading", { name: "RUN du jour" }).closest("section")!;
    const projectSection = screen.getByRole("heading", { name: "Tâches Projet du jour" }).closest("section")!;
    expect(runSection).toHaveTextContent("Tâche RUN");
    expect(projectSection).toHaveTextContent("Tâche Projet");
    expect(runSection).not.toHaveTextContent("Tâche Projet");
    expect(projectSection).not.toHaveTextContent("Tâche RUN");
  });

  it("place demain (hors priorité) dans « Échéances »", () => {
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "Tâche de demain", schedule: { granularity: "day", value: TOMORROW } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    const section = screen.getByRole("heading", { name: "Échéances" }).closest("section")!;
    expect(section).toHaveTextContent("Tâche de demain");
  });

  it("« Projets actifs » calcule sa progression depuis les vraies actions, jamais un nombre fixe", () => {
    const state: AppState = {
      workspaces: [projectWorkspace()],
      actionsByWorkspace: {
        p1: [
          action({ id: "a1", workspaceId: "p1", status: "done" }),
          action({ id: "a2", workspaceId: "p1", status: "todo" }),
        ],
      },
      recurrenceRulesByWorkspace: { p1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    const section = screen.getByRole("heading", { name: "Projets actifs" }).closest("section")!;
    // 1 terminée sur 2 -> 50%, recalculé si l'état change (pas une valeur écrite en dur dans l'écran).
    expect(section).toHaveTextContent("Refonte CRM");
    expect(section).toHaveTextContent("50%");
  });

  it("exclut toujours les actions terminées de toutes les sections", () => {
    const state: AppState = {
      workspaces: [runWorkspace()],
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
    expect(screen.getByText("Aucune action prévue aujourd'hui")).toBeInTheDocument();
  });

  it("le bouton « Voir la semaine complète » appelle onOpenWeek", async () => {
    const user = userEvent.setup();
    const onOpenWeek = vi.fn();
    const state: AppState = {
      workspaces: [runWorkspace()],
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
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "Ouvrir le détail", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    await user.click(screen.getByRole("button", { name: /^Ouvrir le détail/ }));
    expect(screen.getByRole("dialog", { name: "Ouvrir le détail" })).toBeInTheDocument();
  });

  it("état vide global explicite, avec une action suivante concrète (jamais un bloc muet)", async () => {
    const user = userEvent.setup();
    const onQuickCreate = vi.fn();
    renderHome(
      {
        workspaces: [runWorkspace()],
        actionsByWorkspace: { w1: [] },
        recurrenceRulesByWorkspace: { w1: [] },
        carnetNotes: [],
      },
      undefined,
      onQuickCreate
    );
    expect(screen.getByText("Aucune action prévue aujourd'hui")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Ajouter une action/ }));
    expect(onQuickCreate).toHaveBeenCalledTimes(1);
  });

  it("le bouton « Traiter » de la priorité immédiate marque l'action résolue sans geste", async () => {
    const user = userEvent.setup();
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "À traiter", schedule: { granularity: "day", value: YESTERDAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    await user.click(screen.getByRole("button", { name: "Traiter" }));
    // La priorité immédiate n'a plus lieu d'être une fois l'action résolue.
    expect(screen.getByText("Aucune action prévue aujourd'hui")).toBeInTheDocument();
  });

  it("affiche un message vide explicite par section quand au moins une autre section a du contenu", () => {
    const state: AppState = {
      workspaces: [runWorkspace()],
      actionsByWorkspace: { w1: [action({ title: "Seule tâche", schedule: { granularity: "day", value: TODAY } })] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    expect(screen.getByText("Aucune tâche Projet prévue aujourd'hui.")).toBeInTheDocument();
    expect(screen.getByText("Aucune échéance proche cette semaine.")).toBeInTheDocument();
  });
});
