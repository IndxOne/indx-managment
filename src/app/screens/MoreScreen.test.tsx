import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoreScreen } from "./MoreScreen";

describe("MoreScreen", () => {
  it("liste les 6 destinations secondaires et déclenche onSelect avec la bonne clé", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoreScreen onSelect={onSelect} />);

    // Réglages est désormais un onglet primaire de BottomNav (5 emplacements
    // — cadrage renouveau mobile Lot A), plus dans ce menu secondaire.
    // "Rappels" et "Cette semaine" — qui occupaient deux des anciens
    // emplacements primaires — y entrent en échange (mobile uniquement).
    expect(screen.queryByRole("button", { name: "Réglages" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rappels" }));
    expect(onSelect).toHaveBeenCalledWith("reminders");

    await user.click(screen.getByRole("button", { name: "Cette semaine" }));
    expect(onSelect).toHaveBeenCalledWith("week");

    await user.click(screen.getByRole("button", { name: "Carnet" }));
    expect(onSelect).toHaveBeenCalledWith("carnet");

    await user.click(screen.getByRole("button", { name: "Hub" }));
    expect(onSelect).toHaveBeenCalledWith("hub");

    await user.click(screen.getByRole("button", { name: "Approches métier" }));
    expect(onSelect).toHaveBeenCalledWith("roles");

    await user.click(screen.getByRole("button", { name: "Recherche" }));
    expect(onSelect).toHaveBeenCalledWith("search");
  });
});
