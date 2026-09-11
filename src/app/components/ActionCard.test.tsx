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
