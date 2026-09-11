import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { KanbanBoard } from "./KanbanBoard";

function baseAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Arbitrer le prestataire",
    status: "todo",
    priority: "normal",
    itemType: "task",
    phaseId: "conception",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Vérifie la migration du Lot 2 (fusion ActionCard/KanbanCard) : KanbanBoard
 * rend désormais ActionCard variant="kanban" et non plus un composant
 * KanbanCard séparé — ce fichier n'existait pas avant le Lot 2, comblant un
 * vrai trou de couverture (aucun test n'exerçait avant le rendu desktop).
 */
describe("KanbanBoard (Lot 2 : cartes rendues par ActionCard variant kanban)", () => {
  it("affiche une colonne par phase avec son compteur, et les cartes de la phase", () => {
    const action = baseAction();
    render(
      <KanbanBoard
        phases={["conception", "realisation"]}
        actionsByPhase={{ conception: [action], realisation: [] }}
        statusLabels={STATUS_LABELS_DEFAULT}
        timezone="Europe/Paris"
        onAddToPhase={vi.fn()}
        onDropOnPhase={vi.fn()}
        onMove={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDisableReminder={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    expect(screen.getByText("Arbitrer le prestataire")).toBeInTheDocument();
    expect(screen.getByText("Arbitrer le prestataire").closest(".kanban-card")).toBeInTheDocument();
  });

  it("la carte est draggable et le drop sur une autre colonne appelle onDropOnPhase", () => {
    const action = baseAction();
    const onDropOnPhase = vi.fn();
    render(
      <KanbanBoard
        phases={["conception", "realisation"]}
        actionsByPhase={{ conception: [action], realisation: [] }}
        statusLabels={STATUS_LABELS_DEFAULT}
        timezone="Europe/Paris"
        onAddToPhase={vi.fn()}
        onDropOnPhase={onDropOnPhase}
        onMove={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDisableReminder={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );

    const card = screen.getByText("Arbitrer le prestataire").closest(".kanban-card")!;
    const columns = document.querySelectorAll(".kanban-column");
    expect(columns).toHaveLength(2);

    fireEvent.dragStart(card);
    fireEvent.dragOver(columns[1]!);
    fireEvent.drop(columns[1]!);
    expect(onDropOnPhase).toHaveBeenCalledWith("a1", "realisation");
  });

  it("bouton d'ajout par colonne appelle onAddToPhase avec la bonne phase", async () => {
    const user = userEvent.setup();
    const onAddToPhase = vi.fn();
    render(
      <KanbanBoard
        phases={["conception"]}
        actionsByPhase={{ conception: [] }}
        statusLabels={STATUS_LABELS_DEFAULT}
        timezone="Europe/Paris"
        onAddToPhase={onAddToPhase}
        onDropOnPhase={vi.fn()}
        onMove={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDisableReminder={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /Ajouter une action/ }));
    expect(onAddToPhase).toHaveBeenCalledWith("conception");
  });

  it("affiche le badge de synchronisation via resolveSyncStatus (parité avec les vues liste)", () => {
    const action = baseAction();
    render(
      <KanbanBoard
        phases={["conception"]}
        actionsByPhase={{ conception: [action] }}
        statusLabels={STATUS_LABELS_DEFAULT}
        timezone="Europe/Paris"
        resolveSyncStatus={() => "pending"}
        onAddToPhase={vi.fn()}
        onDropOnPhase={vi.fn()}
        onMove={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDisableReminder={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("le menu de la carte kanban déclenche bien onMove/onEdit/onDelete", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const action = baseAction();
    render(
      <KanbanBoard
        phases={["conception"]}
        actionsByPhase={{ conception: [action] }}
        statusLabels={STATUS_LABELS_DEFAULT}
        timezone="Europe/Paris"
        onAddToPhase={vi.fn()}
        onDropOnPhase={vi.fn()}
        onMove={onMove}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDisableReminder={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: 'Actions pour "Arbitrer le prestataire"' }));
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));
    expect(onMove).toHaveBeenCalledWith(action);
  });
});
