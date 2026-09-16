import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoreScreen } from "./MoreScreen";

describe("MoreScreen", () => {
  it("liste les 7 destinations et déclenche onSelect avec la bonne clé", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoreScreen onSelect={onSelect} />);

    // Renouveau produit v2.2 : "Cette semaine" et "Rappels" ne sont plus des
    // onglets primaires de BottomNav (remplacés par Aujourd'hui/RUN/création
    // rapide/Projets/Réglages) — ils rejoignent ce menu secondaire.
    await user.click(screen.getByRole("button", { name: "Cette semaine" }));
    expect(onSelect).toHaveBeenCalledWith("week");

    await user.click(screen.getByRole("button", { name: "Rappels" }));
    expect(onSelect).toHaveBeenCalledWith("reminders");

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
