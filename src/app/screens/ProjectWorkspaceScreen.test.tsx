import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

/**
 * Depuis le Lot 3 (Vue Columns canonique), la vue "Par étapes" d'un espace
 * PROJET n'organise plus les actions en sous-sections par itemType
 * (Jalons/Décisions/Risques/Livrables) : toutes les actions d'une phase
 * vivent dans la même colonne, différenciées par leur chip de type sur la
 * carte (`ITEM_TYPE_LABELS`) plutôt que par un titre de section dédié —
 * décision explicite documentée dans le lot (une seule implémentation du
 * concept "colonnes", cohérente desktop/mobile). L'information de type
 * reste visible, seule sa mise en page change.
 */
describe("ProjectWorkspaceScreen — Vue Columns (Lot 3)", () => {
  it("range une décision et un risque dans la même colonne, chacun identifiable par son chip de type", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await screen.findByText("Aucun espace pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Migration ERP");
    await user.click(screen.getByLabelText("Projet avec étapes (PROJET)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    await screen.findByRole("heading", { name: "Migration ERP" });

    // Le CTA de colonne ouvre désormais un champ inline (Lot 4) : "Options
    // avancées" reste le chemin vers le formulaire complet (type, priorité).
    await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
    await user.click(screen.getByRole("button", { name: /Options avancées/ }));
    await user.type(screen.getByLabelText("Titre"), "Arbitrer le prestataire");
    await user.selectOptions(screen.getByLabelText("Type"), "Décision");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));
    await screen.findByText("Arbitrer le prestataire");

    await user.click(screen.getAllByRole("button", { name: /Ajouter une action/ })[0]!);
    await user.click(screen.getByRole("button", { name: /Options avancées/ }));
    await user.type(screen.getByLabelText("Titre"), "Dépendance fournisseur unique");
    await user.selectOptions(screen.getByLabelText("Type"), "Risque");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));
    await screen.findByText("Dépendance fournisseur unique");

    // Les deux actions vivent dans la même colonne (première phase), chacune
    // identifiable par son chip de type — plus de titre de section dédié.
    const decisionCard = screen.getByText("Arbitrer le prestataire").closest(".kanban-card")!;
    const riskCard = screen.getByText("Dépendance fournisseur unique").closest(".kanban-card")!;
    expect(decisionCard).toHaveTextContent("Décision");
    expect(riskCard).toHaveTextContent("Risque");

    // Plus de sections par itemType : aucun titre "Décisions"/"Risques"/"Jalons".
    expect(screen.queryByRole("heading", { name: "Décisions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Risques" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jalons" })).not.toBeInTheDocument();
  });
});
