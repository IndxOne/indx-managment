import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoreScreen } from "./MoreScreen";

describe("MoreScreen", () => {
  it("liste les 5 destinations et déclenche onSelect avec la bonne clé", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoreScreen onSelect={onSelect} />);

    // Rappels est désormais un onglet primaire de BottomNav (Lot 1 du
    // renouveau produit), plus dans le menu secondaire "Plus".
    await user.click(screen.getByRole("button", { name: "Carnet" }));
    expect(onSelect).toHaveBeenCalledWith("carnet");

    await user.click(screen.getByRole("button", { name: "Hub" }));
    expect(onSelect).toHaveBeenCalledWith("hub");

    await user.click(screen.getByRole("button", { name: "Approches métier" }));
    expect(onSelect).toHaveBeenCalledWith("roles");

    await user.click(screen.getByRole("button", { name: "Recherche" }));
    expect(onSelect).toHaveBeenCalledWith("search");

    await user.click(screen.getByRole("button", { name: "Réglages" }));
    expect(onSelect).toHaveBeenCalledWith("app-settings");
  });
});
