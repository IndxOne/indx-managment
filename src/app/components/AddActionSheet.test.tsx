import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Member } from "../../domain/member";
import { AddActionSheet } from "./AddActionSheet";

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    workspaceId: "w1",
    displayName: "Alex",
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AddActionSheet — échéance (Lot B)", () => {
  it("crée sans schedule quand l'échéance est laissée vide (comportement inchangé)", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet onCancel={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Titre"), "Sans échéance");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "Sans échéance", schedule: undefined }));
  });

  it("propage l'échéance saisie comme Schedule { granularity: 'day' } — même type que le reste du domaine", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet onCancel={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Titre"), "Avec échéance");
    await user.type(screen.getByLabelText("Échéance (optionnel)"), "2026-10-05");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Avec échéance",
        schedule: { granularity: "day", value: "2026-10-05" },
      })
    );
  });

  it("n'affiche pas le choix de responsable en l'absence de membres (Solo ou espace non-équipe)", () => {
    render(<AddActionSheet onCancel={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.queryByText("Responsable")).not.toBeInTheDocument();
  });

  it("propage les responsables sélectionnés quand des membres sont fournis (mode Équipe)", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const members = [member({ id: "m1", displayName: "Alex" }), member({ id: "m2", displayName: "Sam" })];
    render(<AddActionSheet members={members} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Titre"), "Assignée");
    await user.click(screen.getByLabelText("Sam"));
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "Assignée", assigneeIds: ["m2"] }));
  });
});
