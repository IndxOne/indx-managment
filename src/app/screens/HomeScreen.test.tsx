import { render, screen, within } from "@testing-library/react";
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

/** Section de la liste (pas le bloc "Focus RUN Immédiat" / "Jalons Projet",
 * qui peut légitimement dupliquer visuellement l'action la plus urgente,
 * cf. réalignement prototype v2.2 §5 — même action montrée deux fois n'est
 * pas une régression ici, juste un raccourci "Traiter" en plus). */
function sectionFor(headingName: string): HTMLElement {
  // level: 2 exclut le <h1> "Aujourd'hui" de l'en-tête d'écran (même texte
  // que la section "Aujourd'hui" des buckets Home, cf. HomeScreen).
  return screen.getByRole("heading", { level: 2, name: headingName }).closest("section")!;
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
    expect(screen.getByRole("heading", { level: 2, name: "Aujourd'hui" })).toBeInTheDocument();
    expect(within(sectionFor("Aujourd'hui")).getByText("Tâche du jour")).toBeInTheDocument();
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
    expect(within(sectionFor("En retard")).getByText("Tâche en retard")).toBeInTheDocument();
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
    expect(within(sectionFor("Bloqué")).getByText("Tâche bloquée")).toBeInTheDocument();
  });

  it("une action en retard ET bloquée n'apparaît qu'une fois dans la liste « En retard » (jamais dupliquée dans « Bloqué »)", () => {
    const state: AppState = {
      workspaces: [workspace()],
      actionsByWorkspace: {
        w1: [action({ title: "Tâche critique", status: "blocked", schedule: { granularity: "day", value: YESTERDAY } })],
      },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    };
    renderHome(state);
    // Une seule occurrence dans la section "En retard" (jamais dans "Bloqué") —
    // une éventuelle 2e occurrence dans "Focus RUN Immédiat" (même action, la
    // plus urgente d'un espace RUN) est un raccourci volontaire, pas un doublon.
    expect(within(sectionFor("En retard")).getAllByText("Tâche critique")).toHaveLength(1);
    expect(within(sectionFor("Bloqué")).queryByText("Tâche critique")).not.toBeInTheDocument();
    // Le statut "Bloqué" reste visible comme indicateur sur la carte, dans la section "En retard".
    expect(sectionFor("En retard")).toHaveTextContent("Bloqué");
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
    // L'action peut aussi apparaître dans "Focus RUN Immédiat" (même action,
    // la plus urgente d'un espace RUN) : on cible explicitement la carte de
    // la section "Aujourd'hui" plutôt qu'un match ambigu sur tout l'écran.
    await user.click(within(sectionFor("Aujourd'hui")).getByRole("button", { name: /^Ouvrir le détail/ }));
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

describe("HomeScreen — grille de métriques (réalignement prototype v2.2 §5, données réelles)", () => {
  it("calcule RUN Actifs / Résolus aujourd'hui / Échéances proches / Progression à partir du store, sans valeur figée", () => {
    const NOW = new Date(`${TODAY}T12:00:00.000Z`);
    const state: AppState = {
      workspaces: [workspace({ id: "w1", kind: "run" }), workspace({ id: "w2", kind: "project", name: "Refonte CRM" })],
      actionsByWorkspace: {
        // RUN : 1 active (compte pour RUN Actifs + Échéances proches),
        // 1 terminée aujourd'hui (compte pour Résolus aujourd'hui + Progression).
        w1: [
          action({ id: "a1", workspaceId: "w1", title: "Incident actif", schedule: { granularity: "day", value: TODAY } }),
          action({
            id: "a2",
            workspaceId: "w1",
            title: "Incident résolu",
            status: "done",
            completedAt: NOW.toISOString(),
          }),
        ],
        // PROJET : 1 jalon aujourd'hui (Échéances proches + Jalons Projet),
        // 1 déjà terminée (Progression seulement).
        w2: [
          action({
            id: "a3",
            workspaceId: "w2",
            title: "Livraison prototype",
            itemType: "milestone",
            schedule: { granularity: "day", value: TODAY },
          }),
          action({ id: "a4", workspaceId: "w2", title: "Tâche déjà finie", status: "done" }),
        ],
      },
      recurrenceRulesByWorkspace: { w1: [], w2: [] },
      carnetNotes: [],
    };
    renderHome(state);

    // RUN Actifs = 1 (a1, seule action non terminée d'un espace RUN).
    const runTile = screen.getByText("RUN Actifs").closest(".stat-tile") as HTMLElement;
    expect(within(runTile).getByText("1")).toBeInTheDocument();

    // Résolus aujourd'hui = 1 (a2, completedAt aujourd'hui) — a4 est
    // terminée mais sans completedAt, donc jamais comptée ici (pas de valeur
    // inventée pour une donnée absente).
    const resolvedTile = screen.getByText("Résolus aujourd'hui").closest(".stat-tile") as HTMLElement;
    expect(within(resolvedTile).getByText("1")).toBeInTheDocument();

    // Échéances proches = 2 (a1 + a3, toutes deux planifiées aujourd'hui).
    const upcomingTile = screen.getByText("Échéances proches").closest(".stat-tile") as HTMLElement;
    expect(within(upcomingTile).getByText("2")).toBeInTheDocument();

    // Progression = terminées / total = 2/4 = 50 %.
    const progressTile = screen.getByText("Progression").closest(".stat-tile") as HTMLElement;
    expect(within(progressTile).getByText("50%")).toBeInTheDocument();

    // Focus RUN Immédiat reprend l'action RUN active la plus urgente.
    expect(screen.getByRole("heading", { name: "Focus RUN Immédiat" })).toBeInTheDocument();
    expect(within(sectionFor("Focus RUN Immédiat")).getByText("Incident actif")).toBeInTheDocument();

    // Jalons Projet reprend la prochaine échéance PROJET (itemType milestone en priorité).
    expect(screen.getByRole("heading", { name: "Jalons Projet" })).toBeInTheDocument();
    expect(within(sectionFor("Jalons Projet")).getByText("Livraison prototype")).toBeInTheDocument();
  });

  it("Progression affiche un tiret (pas 0% inventé) quand il n'y a encore aucune action", () => {
    renderHome({
      workspaces: [workspace()],
      actionsByWorkspace: { w1: [] },
      recurrenceRulesByWorkspace: { w1: [] },
      carnetNotes: [],
    });
    const progressTile = screen.getByText("Progression").closest(".stat-tile") as HTMLElement;
    expect(within(progressTile).getByText("—")).toBeInTheDocument();
  });

  it("le bouton '+ Créer' de l'en-tête appelle onQuickAdd (seul déclencheur mobile de création rapide, prototype)", async () => {
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    render(
      <AnnouncerProvider>
        <StoreProvider initialState={{ workspaces: [], actionsByWorkspace: {}, recurrenceRulesByWorkspace: {}, carnetNotes: [] }}>
          <HomeScreen timezone={TZ} onNavigateToWorkspace={() => {}} onOpenWeek={() => {}} onQuickAdd={onQuickAdd} />
        </StoreProvider>
      </AnnouncerProvider>
    );
    await user.click(screen.getByRole("button", { name: /Créer/ }));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
  });

  it("sans onQuickAdd, n'affiche aucun bouton de création (comportement inchangé pour un appelant qui ne le fournit pas)", () => {
    renderHome({
      workspaces: [],
      actionsByWorkspace: {},
      recurrenceRulesByWorkspace: {},
      carnetNotes: [],
    });
    expect(screen.queryByRole("button", { name: /Créer/ })).not.toBeInTheDocument();
  });
});
