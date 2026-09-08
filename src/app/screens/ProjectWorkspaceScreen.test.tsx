import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("ProjectWorkspaceScreen — sections par type (jsdom)", () => {
  it("range une décision et un risque dans leurs sections dédiées, séparées des livrables", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Aucun espace pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Migration ERP");
    await user.click(screen.getByLabelText("Projet avec étapes (PROJET)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    await screen.findByRole("heading", { name: "Migration ERP" });

    await user.click(screen.getByRole("button", { name: "Ajouter une action" }));
    await user.type(screen.getByLabelText("Titre"), "Arbitrer le prestataire");
    await user.selectOptions(screen.getByLabelText("Type"), "Décision");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.click(screen.getByRole("button", { name: "Ajouter une action" }));
    await user.type(screen.getByLabelText("Titre"), "Dépendance fournisseur unique");
    await user.selectOptions(screen.getByLabelText("Type"), "Risque");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(await screen.findByRole("heading", { name: "Décisions" })).toBeInTheDocument();
    expect(screen.getByText("Arbitrer le prestataire")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risques" })).toBeInTheDocument();
    expect(screen.getByText("Dépendance fournisseur unique")).toBeInTheDocument();

    // Aucune section vide affichée (Jalons n'a aucune entrée ici).
    expect(screen.queryByRole("heading", { name: "Jalons" })).not.toBeInTheDocument();
  });
});
