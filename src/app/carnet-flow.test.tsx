import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Carnet — parcours bout en bout (jsdom)", () => {
  it("noter une idée, la convertir en action dans un espace, elle disparaît du Carnet", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await screen.findByText("Aucun espace pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Suivi quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "Suivi quotidien" });

    await user.click(screen.getByRole("button", { name: /menu secondaire/i }));
    await user.click(screen.getByRole("button", { name: "Carnet" }));

    await user.type(screen.getByLabelText("Nouvelle note"), "Relancer le fournisseur X");
    await user.click(screen.getByRole("button", { name: "Ajouter une note" }));
    expect(await screen.findByText("Relancer le fournisseur X")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Convertir en action" }));
    await user.click(screen.getByRole("button", { name: /Suivi quotidien/ }));

    // La note a quitté le Carnet.
    await screen.findByText("Carnet vide");

    // L'action existe dans l'espace, avec le texte de la note comme titre.
    await user.click(screen.getByRole("button", { name: /projets/i }));
    await user.click(screen.getByRole("button", { name: /suivi quotidien/i }));
    expect(await screen.findByText("Relancer le fournisseur X")).toBeInTheDocument();
  });

  it("supprimer une note sans la convertir la retire du Carnet", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /menu secondaire/i }));
    await user.click(screen.getByRole("button", { name: "Carnet" }));

    await user.type(screen.getByLabelText("Nouvelle note"), "Idée jetable");
    await user.click(screen.getByRole("button", { name: "Ajouter une note" }));
    await screen.findByText("Idée jetable");

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.queryByText("Idée jetable")).not.toBeInTheDocument();
    expect(await screen.findByText("Carnet vide")).toBeInTheDocument();
  });
});
