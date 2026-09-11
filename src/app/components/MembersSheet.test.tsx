import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Member } from "../../domain/member";
import { MembersSheet } from "./MembersSheet";

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    workspaceId: "w1",
    displayName: "Koffi",
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("MembersSheet", () => {
  it("affiche l'état vide quand aucun membre", () => {
    render(<MembersSheet members={[]} onClose={vi.fn()} onAdd={vi.fn()} onRename={vi.fn()} onSetActive={vi.fn()} />);
    expect(screen.getByText("Aucun membre pour l'instant.")).toBeInTheDocument();
  });

  it("liste les membres, affiche « Inactif » pour un membre désactivé", () => {
    render(
      <MembersSheet
        members={[member(), member({ id: "m2", displayName: "Alice", active: false })]}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onRename={vi.fn()}
        onSetActive={vi.fn()}
      />
    );
    expect(screen.getByText("Koffi")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Inactif")).toBeInTheDocument();
  });

  it("ajouter un membre via le champ inline appelle onAdd et vide le champ", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<MembersSheet members={[]} onClose={vi.fn()} onAdd={onAdd} onRename={vi.fn()} onSetActive={vi.fn()} />);

    const input = screen.getByLabelText("Nom du nouveau membre");
    await user.type(input, "Alice");
    await user.keyboard("{Enter}");

    expect(onAdd).toHaveBeenCalledWith("Alice");
    expect(input).toHaveValue("");
  });

  it("renommer un membre : édition inline puis confirmation appelle onRename", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<MembersSheet members={[member()]} onClose={vi.fn()} onAdd={vi.fn()} onRename={onRename} onSetActive={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Renommer Koffi" }));
    const input = screen.getByLabelText("Nouveau nom pour Koffi");
    await user.clear(input);
    await user.type(input, "Koffi N.");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onRename).toHaveBeenCalledWith("m1", "Koffi N.");
  });

  it("annuler le renommage ne modifie rien", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<MembersSheet members={[member()]} onClose={vi.fn()} onAdd={vi.fn()} onRename={onRename} onSetActive={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Renommer Koffi" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("Koffi")).toBeInTheDocument();
  });

  it("désactiver puis réactiver un membre appelle onSetActive avec la bonne valeur", async () => {
    const user = userEvent.setup();
    const onSetActive = vi.fn();
    render(<MembersSheet members={[member()]} onClose={vi.fn()} onAdd={vi.fn()} onRename={vi.fn()} onSetActive={onSetActive} />);

    await user.click(screen.getByRole("button", { name: "Désactiver Koffi" }));
    expect(onSetActive).toHaveBeenCalledWith("m1", false);
  });
});
