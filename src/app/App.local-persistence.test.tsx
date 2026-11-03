import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App — mode local (sans backend)", () => {
  it("conserve les données après un rechargement de l'app", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Plus$/ }));
    await user.click(screen.getByRole("button", { name: "Notes" }));
    await user.type(screen.getByLabelText("Nouvelle note"), "Idée à garder");
    await user.click(screen.getByRole("button", { name: "Ajouter une note" }));
    first.unmount();

    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Plus$/ }));
    await user.click(screen.getByRole("button", { name: "Notes" }));
    expect(await screen.findByText("Idée à garder")).toBeInTheDocument();
  });
});
