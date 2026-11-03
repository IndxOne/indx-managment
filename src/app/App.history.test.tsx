import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App — retour arrière natif (historique navigateur)", () => {
  it("le geste/bouton retour revient à l'écran précédent au lieu de quitter l'app", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /^Plus$/ }));
    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(await screen.findByRole("heading", { name: "Notes" })).toBeInTheDocument();

    act(() => window.history.back());
    expect(await screen.findByRole("heading", { name: "Plus" })).toBeInTheDocument();
  });
});
