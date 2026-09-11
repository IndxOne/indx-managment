import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { ActionCard } from "./ActionCard";

function baseAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Relancer le prestataire",
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

async function openMenu(user: ReturnType<typeof userEvent.setup>, title = "Relancer le prestataire") {
  await user.click(screen.getByRole("button", { name: `Actions pour "${title}"` }));
}

describe("ActionCard — cycle de statut 1-clic", () => {
  it("affiche la checkbox de statut et déclenche onCycleStatus au clic", async () => {
    const user = userEvent.setup();
    const onCycleStatus = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onCycleStatus={onCycleStatus}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /Relancer le prestataire/ });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(onCycleStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["todo", "false"],
    ["doing", "mixed"],
    ["done", "true"],
    ["waiting", "false"],
  ] as const)("aria-checked reflète le statut %s", (status, expected) => {
    render(
      <ActionCard
        action={baseAction({ status })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onCycleStatus={vi.fn()}
      />
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", expected);
  });

  it("n'affiche aucune checkbox si onCycleStatus n'est pas fourni", () => {
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={vi.fn()} />
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

// jsdom n'implémente pas PointerEvent : on déclenche les mêmes types
// d'événement via MouseEvent, qui porte bien clientX/clientY (seul
// `pointerId`, absent des deux côtés, reste indéfini — sans effet puisque
// le composant ne fait que comparer les deux occurrences entre elles).
function swipe(element: Element, deltaX: number) {
  fireEvent(element, new MouseEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
  fireEvent(element, new MouseEvent("pointermove", { clientX: deltaX, clientY: 0, bubbles: true }));
  fireEvent(element, new MouseEvent("pointerup", { clientX: deltaX, clientY: 0, bubbles: true }));
}

describe("ActionCard — swipe (terminer / replanifier)", () => {
  it("swipe à droite au-delà du seuil déclenche onSwipeComplete", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    swipe(screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!, 120);
    expect(onSwipeComplete).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("swipe à gauche au-delà du seuil déclenche onMove (équivalent de \"Déplacer\")", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    swipe(screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!, -120);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onSwipeComplete).not.toHaveBeenCalled();
  });

  it("un déplacement sous le seuil ne déclenche rien", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    swipe(screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!, 40);
    expect(onSwipeComplete).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("pointercancel après un swipe au-delà du seuil n'entraîne aucune action", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    const content = screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!;
    fireEvent(content, new MouseEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
    fireEvent(content, new MouseEvent("pointermove", { clientX: 120, clientY: 0, bubbles: true }));
    fireEvent(content, new MouseEvent("pointercancel", { clientX: 120, clientY: 0, bubbles: true }));
    expect(onSwipeComplete).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("une souris relâchée hors de la carte avant capture efface le drag en attente", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    const content = screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!;
    // Encore sous le seuil d'engagement horizontal (pas de capture) quand la souris sort.
    fireEvent(content, new MouseEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
    fireEvent(content, new MouseEvent("pointerleave", { clientX: 3, clientY: 0, bubbles: true }));
    // Un geste ultérieur (même pointerId côté navigateur) ne doit rien devoir à l'ancien drag.
    fireEvent(content, new MouseEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
    fireEvent(content, new MouseEvent("pointermove", { clientX: 120, clientY: 0, bubbles: true }));
    fireEvent(content, new MouseEvent("pointerup", { clientX: 120, clientY: 0, bubbles: true }));
    expect(onSwipeComplete).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("une action déjà terminée ne propose pas le swipe de complétion", () => {
    const onSwipeComplete = vi.fn();
    render(
      <ActionCard
        action={baseAction({ status: "done" })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onSwipeComplete={onSwipeComplete}
      />
    );
    swipe(screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!, 120);
    expect(onSwipeComplete).not.toHaveBeenCalled();
  });
});

describe("ActionCard — menu d'actions unique", () => {
  it("n'affiche qu'un seul bouton visible par défaut (plus de rangée de boutons)", () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: 'Actions pour "Relancer le prestataire"' })).toBeInTheDocument();
  });

  it("ouvre le menu et déclenche Déplacer", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={onMove} />
    );
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("ouvre le menu et déclenche Éditer, ferme le menu ensuite", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onEdit={onEdit}
      />
    );
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: /Éditer/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Éditer/ })).not.toBeInTheDocument();
  });

  it("ouvre le menu et déclenche Supprimer", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onDelete={onDelete}
      />
    );
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: /Supprimer/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("propose Notes et Lien dans le menu, avec le libellé qui reflète l'état", async () => {
    const user = userEvent.setup();
    const onOpenNotes = vi.fn();
    const onOpenLink = vi.fn();
    render(
      <ActionCard
        action={baseAction({
          notes: [{ id: "n1", text: "Note", createdAt: "2026-09-08T00:00:00.000Z" }],
          linkedActionId: "a2",
        })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenNotes={onOpenNotes}
        onOpenLink={onOpenLink}
      />
    );
    await openMenu(user);
    expect(screen.getByRole("button", { name: /^Notes/ })).toBeInTheDocument();
    expect(screen.getByText("1 note")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Action liée/ }));
    expect(onOpenLink).toHaveBeenCalledTimes(1);
  });

  it("affiche des indicateurs notes/lien sur la carte, sans bouton dédié", () => {
    render(
      <ActionCard
        action={baseAction({
          notes: [{ id: "n1", text: "Note", createdAt: "2026-09-08T00:00:00.000Z" }],
          linkedActionId: "a2",
        })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("ActionCard — badge de synchronisation (Lot 3 §2)", () => {
  it("n'affiche aucun badge par défaut (action synchronisée)", () => {
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={vi.fn()} />
    );
    expect(screen.queryByText("En attente")).not.toBeInTheDocument();
    expect(screen.queryByText("Conflit")).not.toBeInTheDocument();
  });

  it('affiche "En attente" quand syncStatus vaut "pending"', () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        syncStatus="pending"
      />
    );
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it('affiche "Conflit" quand syncStatus vaut "conflict"', () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        syncStatus="conflict"
      />
    );
    expect(screen.getByText("Conflit")).toBeInTheDocument();
  });
});

describe("ActionCard — ouverture du détail (Lot 5)", () => {
  it("sans onOpenDetail, le titre n'est pas un bouton (comportement inchangé)", () => {
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: /^Relancer le prestataire/ })).not.toBeInTheDocument();
  });

  it("le clic sur le titre appelle onOpenDetail (variant list)", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    );
    await user.click(screen.getByRole("button", { name: /^Relancer le prestataire/ }));
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it("le clic sur la checkbox de statut n'ouvre pas le détail", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const onCycleStatus = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onCycleStatus={onCycleStatus}
        onOpenDetail={onOpenDetail}
      />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onCycleStatus).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("le clic sur le menu n'ouvre pas le détail", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenDetail={onOpenDetail}
      />
    );
    await openMenu(user);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("un swipe committed n'ouvre pas le détail ensuite", () => {
    const onOpenDetail = vi.fn();
    const onSwipeComplete = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onSwipeComplete={onSwipeComplete}
        onOpenDetail={onOpenDetail}
      />
    );
    const content = screen.getByText("Relancer le prestataire").closest(".action-card-swipe-content")!;
    swipe(content, 120);
    expect(onSwipeComplete).toHaveBeenCalledTimes(1);
    // Le clic natif éventuellement synthétisé par le navigateur après le
    // swipe ne doit pas rouvrir le détail.
    fireEvent.click(screen.getByRole("button", { name: /^Relancer le prestataire/ }));
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("en variant kanban, le clic sur le titre appelle onOpenDetail et un dragstart le neutralise", () => {
    const onOpenDetail = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={vi.fn()}
        onOpenDetail={onOpenDetail}
        draggable
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />
    );
    const button = screen.getByRole("button", { name: /^Relancer le prestataire/ });
    fireEvent.click(button);
    expect(onOpenDetail).toHaveBeenCalledTimes(1);

    onOpenDetail.mockClear();
    const card = button.closest(".kanban-card")!;
    fireEvent.dragStart(card);
    fireEvent.click(button);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});

describe("ActionCard — variant kanban (Lot 2 : fusion avec l'ancienne KanbanCard)", () => {
  it("affiche un chip de statut coloré plutôt qu'une checkbox", () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={vi.fn()}
        onCycleStatus={vi.fn()}
      />
    );
    // Même si onCycleStatus est fourni, le variant kanban n'affiche jamais de checkbox.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("À faire")).toHaveClass("status-chip");
  });

  it("est draggable et déclenche onDragStart/onDragEnd", () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={vi.fn()}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    );
    const card = screen.getByText("Relancer le prestataire").closest(".kanban-card")!;
    expect(card).toHaveAttribute("draggable", "true");
    fireEvent.dragStart(card);
    expect(onDragStart).toHaveBeenCalledTimes(1);
    fireEvent.dragEnd(card);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("le swipe est désactivé en variant kanban même si onSwipeComplete est fourni", () => {
    const onSwipeComplete = vi.fn();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={onMove}
        onSwipeComplete={onSwipeComplete}
      />
    );
    const card = screen.getByText("Relancer le prestataire").closest(".kanban-card")!;
    expect(card.querySelector(".action-card-swipe-bg")).not.toBeInTheDocument();
    swipe(card, 120);
    expect(onSwipeComplete).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("réutilise le même menu d'actions (Notes/Lien/Déplacer/Éditer/Supprimer) que le variant list", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={onMove}
      />
    );
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("affiche le badge de synchronisation, comme le variant list (parité desktop/mobile)", () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={vi.fn()}
        syncStatus="pending"
      />
    );
    expect(screen.getByText("En attente")).toBeInTheDocument();
  });

  it("affiche une bannière de relance active même avant échéance (comportement propre au variant kanban, conservé)", () => {
    render(
      <ActionCard
        action={baseAction({
          status: "waiting",
          waitingSince: new Date().toISOString(),
          waitingReminder: { afterDays: 3, enabled: true, history: [] },
        })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        variant="kanban"
        onMove={vi.fn()}
        onDisableReminder={vi.fn()}
      />
    );
    expect(screen.getByText("Relance active")).toBeInTheDocument();
  });
});
