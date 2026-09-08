import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { NotesSheet } from "./NotesSheet";

function baseAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Relancer le prestataire",
    status: "waiting",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("NotesSheet", () => {
  it("affiche un message si aucune note", () => {
    render(<NotesSheet action={baseAction()} onClose={vi.fn()} onAddNote={vi.fn()} />);
    expect(screen.getByText("Aucune note pour l'instant.")).toBeInTheDocument();
  });

  it("liste les notes existantes, de la plus ancienne à la plus récente", () => {
    render(
      <NotesSheet
        action={baseAction({
          notes: [
            { id: "n1", text: "Première note", createdAt: "2026-09-08T09:00:00.000Z" },
            { id: "n2", text: "Deuxième note", createdAt: "2026-09-09T09:00:00.000Z" },
          ],
        })}
        onClose={vi.fn()}
        onAddNote={vi.fn()}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Première note");
    expect(items[1]).toHaveTextContent("Deuxième note");
  });

  it("ajoute une note et vide le champ", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();
    render(<NotesSheet action={baseAction()} onClose={vi.fn()} onAddNote={onAddNote} />);

    const textarea = screen.getByLabelText("Ajouter une note");
    await user.type(textarea, "Relance envoyée");
    await user.click(screen.getByRole("button", { name: "Ajouter la note" }));

    expect(onAddNote).toHaveBeenCalledWith("Relance envoyée");
    expect(textarea).toHaveValue("");
  });

  it("désactive le bouton d'ajout pour un texte vide ou blanc", async () => {
    const user = userEvent.setup();
    render(<NotesSheet action={baseAction()} onClose={vi.fn()} onAddNote={vi.fn()} />);

    const submit = screen.getByRole("button", { name: "Ajouter la note" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Ajouter une note"), "   ");
    expect(submit).toBeDisabled();
  });
});
