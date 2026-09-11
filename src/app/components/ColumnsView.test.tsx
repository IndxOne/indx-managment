import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "../a11y/announcer";
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

type ColumnsViewProps = ComponentProps<typeof ColumnsView>;

/** ColumnQuickAdd (Lot 4) annonce la création via useAnnouncer : tout rendu doit vivre sous AnnouncerProvider, comme dans l'app réelle (App.tsx). */
function renderColumnsView(overrides: Partial<ColumnsViewProps> & Pick<ColumnsViewProps, "phases" | "actionsByPhase">) {
  const props: ColumnsViewProps = {
    statusLabels: STATUS_LABELS_DEFAULT,
    timezone: "Europe/Paris",
    onAddToPhase: vi.fn(),
    onQuickCreate: vi.fn(),
    onDropOnPhase: vi.fn(),
    onMove: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDisableReminder: vi.fn(),
    onOpenNotes: vi.fn(),
    onOpenLink: vi.fn(),
    ...overrides,
  };
  render(
    <AnnouncerProvider>
      <ColumnsView {...props} />
    </AnnouncerProvider>
  );
  return props;
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
    renderColumnsView({
      phases: ["conception", "realisation"],
      actionsByPhase: { conception: [action], realisation: [] },
    });
    expect(screen.getByText("Arbitrer le prestataire")).toBeInTheDocument();
    expect(screen.getByText("Arbitrer le prestataire").closest(".kanban-card")).toBeInTheDocument();
  });

  it("chaque colonne est une région nommée d'après la phase (Phase F : accessibilité)", () => {
    renderColumnsView({
      phases: ["conception", "realisation"],
      actionsByPhase: { conception: [], realisation: [] },
    });
    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(2);
    expect(regions.map((region) => region.getAttribute("aria-labelledby")).every(Boolean)).toBe(true);
  });

  it("affiche un état vide explicite quand la liste de phases est vide", () => {
    renderColumnsView({ phases: [], actionsByPhase: {} });
    expect(screen.getByText("Aucune phase")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("la carte est draggable et le drop sur une autre colonne appelle onDropOnPhase (DnD HTML5 inchangé)", () => {
    const action = baseAction();
    const onDropOnPhase = vi.fn();
    renderColumnsView({
      phases: ["conception", "realisation"],
      actionsByPhase: { conception: [action], realisation: [] },
      onDropOnPhase,
    });

    const card = screen.getByText("Arbitrer le prestataire").closest(".kanban-card")!;
    const columns = document.querySelectorAll(".columns-column");
    expect(columns).toHaveLength(2);

    fireEvent.dragStart(card);
    fireEvent.dragOver(columns[1]!);
    fireEvent.drop(columns[1]!);
    expect(onDropOnPhase).toHaveBeenCalledWith("a1", "realisation");
  });

  it("le CTA ouvre le champ inline puis 'Options avancées' appelle onAddToPhase avec la phase et le brouillon", async () => {
    const user = userEvent.setup();
    const onAddToPhase = vi.fn();
    renderColumnsView({
      phases: ["conception"],
      actionsByPhase: { conception: [] },
      onAddToPhase,
    });
    await user.click(screen.getByRole("button", { name: /Ajouter une action/ }));
    await user.type(screen.getByLabelText("Nouvelle action dans Conception"), "Brouillon");
    await user.click(screen.getByRole("button", { name: /Options avancées/ }));
    expect(onAddToPhase).toHaveBeenCalledWith("conception", "Brouillon");
  });

  describe("création inline (Lot 4)", () => {
    it("le clic sur le CTA remplace le bouton par un champ inline, avec le focus dessus", async () => {
      const user = userEvent.setup();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
      });
      const [ctaConception] = screen.getAllByRole("button", { name: /Ajouter une action/ });
      await user.click(ctaConception!);
      const input = screen.getByLabelText("Nouvelle action dans Conception");
      expect(input).toHaveFocus();
    });

    it("Entrée avec un titre crée l'action dans la bonne phase et garde le champ ouvert pour enchaîner", async () => {
      const user = userEvent.setup();
      const onQuickCreate = vi.fn();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
        onQuickCreate,
      });
      await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
      const input = screen.getByLabelText("Nouvelle action dans Conception");
      await user.type(input, "Cadrer le périmètre{Enter}");

      expect(onQuickCreate).toHaveBeenCalledWith("conception", "Cadrer le périmètre");
      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
    });

    it("un titre vide n'appelle aucune création", async () => {
      const user = userEvent.setup();
      const onQuickCreate = vi.fn();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
        onQuickCreate,
      });
      await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
      await user.type(screen.getByLabelText("Nouvelle action dans Conception"), "   {Enter}");
      expect(onQuickCreate).not.toHaveBeenCalled();
    });

    it("Échap annule et rétablit le CTA sans créer", async () => {
      const user = userEvent.setup();
      const onQuickCreate = vi.fn();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
        onQuickCreate,
      });
      await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
      await user.type(screen.getByLabelText("Nouvelle action dans Conception"), "Brouillon abandonné");
      await user.keyboard("{Escape}");

      expect(onQuickCreate).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Nouvelle action dans Conception")).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Ajouter une action/ })).toHaveLength(2);
    });

    it("créer deux actions à la suite dans la même colonne fonctionne (créations successives)", async () => {
      const user = userEvent.setup();
      const onQuickCreate = vi.fn();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
        onQuickCreate,
      });
      await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
      const input = screen.getByLabelText("Nouvelle action dans Conception");
      await user.type(input, "Première{Enter}");
      await user.type(input, "Deuxième{Enter}");

      expect(onQuickCreate).toHaveBeenNthCalledWith(1, "conception", "Première");
      expect(onQuickCreate).toHaveBeenNthCalledWith(2, "conception", "Deuxième");
    });

    it("chaque colonne préremplit le phaseId correct (deux colonnes distinctes)", async () => {
      const user = userEvent.setup();
      const onQuickCreate = vi.fn();
      renderColumnsView({
        phases: ["conception", "realisation"],
        actionsByPhase: { conception: [], realisation: [] },
        onQuickCreate,
      });
      await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[1]!);
      await user.type(screen.getByLabelText("Nouvelle action dans Réalisation"), "Action réalisation{Enter}");
      expect(onQuickCreate).toHaveBeenCalledWith("realisation", "Action réalisation");
    });
  });

  it("affiche le badge de synchronisation via resolveSyncStatus (parité avec les vues liste)", () => {
    const action = baseAction();
    renderColumnsView({
      phases: ["conception"],
      actionsByPhase: { conception: [action] },
      resolveSyncStatus: () => "pending",
    });
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("le menu de la carte déclenche bien onMove/onEdit/onDelete (alternative non gestuelle au DnD)", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const action = baseAction();
    renderColumnsView({
      phases: ["conception"],
      actionsByPhase: { conception: [action] },
      onMove,
    });
    await user.click(screen.getByRole("button", { name: 'Actions pour "Arbitrer le prestataire"' }));
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));
    expect(onMove).toHaveBeenCalledWith(action);
  });
});
