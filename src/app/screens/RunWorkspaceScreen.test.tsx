import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { todayInTimeZone } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { AnnouncerProvider } from "../a11y/announcer";
import { StoreProvider, type AppState } from "../adapters/temporary-store";
import { ToastProvider } from "../components/Toast";
import { RunWorkspaceScreen } from "./RunWorkspaceScreen";

const TZ = "Europe/Paris";
const TODAY = todayInTimeZone(TZ);

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
    title: "Action",
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    schedule: { granularity: "day", value: TODAY },
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
  };
  return render(
    <AnnouncerProvider>
      <ToastProvider>
        <StoreProvider initialState={state}>
          <RunWorkspaceScreen workspace={ws} timezone={TZ} onOpenSettings={() => {}} onNavigateToWorkspace={() => {}} />
        </StoreProvider>
      </ToastProvider>
    </AnnouncerProvider>
  );
}

describe("RunWorkspaceScreen — rupture de densité actif / résolu (renouveau mobile, Lot A)", () => {
  it("une action active affiche le pied de carte « Traiter » séparé, une résolue n'affiche qu'une rangée compacte", () => {
    renderScreen([
      action({ id: "a1", title: "En cours de traitement" }),
      action({ id: "a2", title: "Déjà réglée", status: "done", completedAt: "2026-09-10T10:00:00.000Z" }),
    ]);

    // Section "Résolu" : rangée compacte avec badge, jamais la carte complète.
    const resolvedSection = screen.getByRole("heading", { name: "Résolu" }).closest("section")!;
    expect(resolvedSection).toHaveTextContent("Résolu");
    expect(resolvedSection).toHaveTextContent("Déjà réglée");
    expect(resolvedSection.querySelector(".action-card-footer")).not.toBeInTheDocument();

    // Carte active : bouton "Traiter" visible, alternative non gestuelle au swipe.
    expect(screen.getByRole("button", { name: "Traiter" })).toBeInTheDocument();
  });

  it("« Traiter » marque l'action résolue sans aucun geste, et bascule aussitôt dans la section « Résolu »", async () => {
    const user = userEvent.setup();
    renderScreen([action({ id: "a1", title: "À régler" })]);

    await user.click(screen.getByRole("button", { name: "Traiter" }));

    expect(screen.queryByRole("button", { name: "Traiter" })).not.toBeInTheDocument();
    const resolvedSection = screen.getByRole("heading", { name: "Résolu" }).closest("section")!;
    expect(resolvedSection).toHaveTextContent("À régler");
  });

  it("« Réouvrir » depuis une rangée résolue la fait redisparaître de « Résolu »", async () => {
    const user = userEvent.setup();
    renderScreen([action({ id: "a1", title: "Résolue par erreur", status: "done", completedAt: "2026-09-10T10:00:00.000Z" })]);

    await user.click(screen.getByRole("button", { name: /Réouvrir/ }));

    expect(screen.queryByRole("heading", { name: "Résolu" })).not.toBeInTheDocument();
    expect(screen.getByText("Résolue par erreur")).toBeInTheDocument();
  });

  it("état vide explicite avec une action suivante concrète (pas de bloc muet)", async () => {
    const user = userEvent.setup();
    renderScreen([]);
    expect(screen.getByText("Aucune action prévue")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Ajouter une action/ }));
    expect(screen.getByLabelText("Titre")).toBeInTheDocument();
  });

  it("créer une action via la capture rapide affiche un toast de confirmation", async () => {
    const user = userEvent.setup();
    renderScreen([]);
    await user.type(screen.getByLabelText("Nouvelle action"), "Nouvelle intervention");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(await screen.findByText("Action créée.")).toBeInTheDocument();
  });
});
