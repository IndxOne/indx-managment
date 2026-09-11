import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Member } from "../../domain/member";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { EMPTY_FILTERS } from "../utils/filter-actions";
import { FilterSheet } from "./FilterSheet";

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

describe("FilterSheet — statut", () => {
  it("propose les cinq statuts, dans l'ordre todo/doing/blocked/waiting/done", () => {
    render(<FilterSheet filters={EMPTY_FILTERS} statusLabels={STATUS_LABELS_DEFAULT} onChange={vi.fn()} onClose={vi.fn()} />);

    const checkboxes = screen.getAllByRole("checkbox").slice(0, 5);
    const labels = checkboxes.map((checkbox) => checkbox.closest("label")?.textContent);
    expect(labels).toEqual(["À faire", "En cours", "Bloqué", "En attente", "Terminé"]);
  });

  it("cocher « Bloqué » ajoute le statut réel aux filtres", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterSheet filters={EMPTY_FILTERS} statusLabels={STATUS_LABELS_DEFAULT} onChange={onChange} onClose={vi.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: /Bloqué/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: new Set(["blocked"]) }));
  });
});

describe("FilterSheet — responsable (Lot 8B)", () => {
  it("n'affiche aucune section Responsable en mode Solo (members absent)", () => {
    render(<FilterSheet filters={EMPTY_FILTERS} statusLabels={STATUS_LABELS_DEFAULT} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText("Responsable")).not.toBeInTheDocument();
  });

  it("affiche Tous / membres / Non assigné en mode Équipe", () => {
    const alice = member({ id: "m2", displayName: "Alice" });
    render(
      <FilterSheet
        filters={EMPTY_FILTERS}
        statusLabels={STATUS_LABELS_DEFAULT}
        members={[member(), alice]}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("radio", { name: "Tous" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Koffi" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Non assigné" })).toBeInTheDocument();
  });

  it("choisir un membre met à jour le filtre assignee", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterSheet
        filters={EMPTY_FILTERS}
        statusLabels={STATUS_LABELS_DEFAULT}
        members={[member()]}
        onChange={onChange}
        onClose={vi.fn()}
      />
    );
    await user.click(screen.getByRole("radio", { name: "Koffi" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ assignee: "m1" }));
  });

  it("ne propose pas un membre inactif comme option normale", () => {
    render(
      <FilterSheet
        filters={EMPTY_FILTERS}
        statusLabels={STATUS_LABELS_DEFAULT}
        members={[member({ active: false })]}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("radio", { name: "Koffi" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tous" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Non assigné" })).toBeInTheDocument();
  });
});
