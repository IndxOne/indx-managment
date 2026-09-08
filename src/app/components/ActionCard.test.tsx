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
