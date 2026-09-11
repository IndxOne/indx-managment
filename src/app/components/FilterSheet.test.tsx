import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { EMPTY_FILTERS } from "../utils/filter-actions";
import { FilterSheet } from "./FilterSheet";

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
