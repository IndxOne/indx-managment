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
