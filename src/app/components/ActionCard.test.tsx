import { render, screen } from "@testing-library/react";
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

  it("reste accessible au clavier via le bouton Déplacer pour les cas hors cycle rapide", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={onMove}
        onCycleStatus={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /Déplacer/ }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });
});

describe("ActionCard — bouton notes", () => {
  it("n'affiche aucun compteur sans note", () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenNotes={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: 'Notes de "Relancer le prestataire"' })).toBeInTheDocument();
  });

  it("affiche le compteur de notes et déclenche onOpenNotes au clic", async () => {
    const user = userEvent.setup();
    const onOpenNotes = vi.fn();
    render(
      <ActionCard
        action={baseAction({ notes: [{ id: "n1", text: "Note 1", createdAt: "2026-09-08T00:00:00.000Z" }] })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenNotes={onOpenNotes}
      />
    );
    const button = screen.getByRole("button", { name: 'Notes de "Relancer le prestataire" (1)' });
    await user.click(button);
    expect(onOpenNotes).toHaveBeenCalledTimes(1);
  });

  it("n'affiche aucun bouton notes si onOpenNotes n'est pas fourni", () => {
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: /Notes de/ })).not.toBeInTheDocument();
  });
});

describe("ActionCard — bouton lien", () => {
  it("propose de lier quand aucun lien n'existe", () => {
    render(
      <ActionCard
        action={baseAction()}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenLink={vi.fn()}
      />
    );
    const button = screen.getByRole("button", { name: 'Lier "Relancer le prestataire" à une autre action' });
    expect(button).toHaveAttribute("data-linked", "false");
  });

  it("indique qu'un lien existe et déclenche onOpenLink au clic", async () => {
    const user = userEvent.setup();
    const onOpenLink = vi.fn();
    render(
      <ActionCard
        action={baseAction({ linkedActionId: "a2" })}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        onMove={vi.fn()}
        onOpenLink={onOpenLink}
      />
    );
    const button = screen.getByRole("button", { name: 'Action liée pour "Relancer le prestataire"' });
    expect(button).toHaveAttribute("data-linked", "true");
    await user.click(button);
    expect(onOpenLink).toHaveBeenCalledTimes(1);
  });

  it("n'affiche aucun bouton lien si onOpenLink n'est pas fourni", () => {
    render(
      <ActionCard action={baseAction()} timezone="Europe/Paris" statusLabels={STATUS_LABELS_DEFAULT} onMove={vi.fn()} />
    );
    expect(screen.queryByRole("button", { name: /lier/i })).not.toBeInTheDocument();
  });
});
