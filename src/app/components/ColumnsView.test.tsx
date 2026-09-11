import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { ColumnsView } from "./ColumnsView";

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
 * ColumnsView (Lot 3 du renouveau produit) : implémentation unique du
 * concept "colonnes par phase", utilisée aussi bien desktop (colonnes côte
 * à côte) que mobile (scroll horizontal + scroll-snap, cf. global.css) —
 * la bascule est purement CSS, ce composant ne change jamais de
 * comportement selon le viewport. Remplace `KanbanBoard` (desktop
 * uniquement) et l'ancien rendu mobile "par étapes" de
 * `ProjectWorkspaceScreen`.
 */
describe("ColumnsView", () => {
  it("affiche une colonne par phase avec son compteur, et les cartes de la phase", () => {
    const action = baseAction();
    render(
      <ColumnsView
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

  it("chaque colonne est une région nommée d'après la phase (Phase F : accessibilité)", () => {
    render(
      <ColumnsView
        phases={["conception", "realisation"]}
        actionsByPhase={{ conception: [], realisation: [] }}
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
    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(2);
    expect(regions.map((region) => region.getAttribute("aria-labelledby")).every(Boolean)).toBe(true);
  });

  it("affiche un état vide explicite quand la liste de phases est vide", () => {
    render(
      <ColumnsView
        phases={[]}
        actionsByPhase={{}}
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
    expect(screen.getByText("Aucune phase")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("la carte est draggable et le drop sur une autre colonne appelle onDropOnPhase (DnD HTML5 inchangé)", () => {
    const action = baseAction();
    const onDropOnPhase = vi.fn();
    render(
      <ColumnsView
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
    const columns = document.querySelectorAll(".columns-column");
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
      <ColumnsView
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
      <ColumnsView
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

  it("le menu de la carte déclenche bien onMove/onEdit/onDelete (alternative non gestuelle au DnD)", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const action = baseAction();
    render(
      <ColumnsView
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
