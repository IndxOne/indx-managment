import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App — parcours mobile bout en bout (jsdom)", () => {
  it("créer un espace RUN, voir sa carte, l'ouvrir, ajouter une action", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Porte de démarrage : le contenu réel apparaît après le premier effet.
    // L'app s'ouvre désormais sur Accueil (Home) — on rejoint Projets pour
    // créer un espace (décision produit validée, Lot 1 du renouveau produit).
    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(await screen.findByText("Aucun espace pour l'instant")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN SI quotidien");
    await user.click(screen.getByLabelText("Travail continu (RUN)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    // Navigation immédiate vers l'écran RUN de l'espace créé.
    expect(await screen.findByRole("heading", { name: "RUN SI quotidien" })).toBeInTheDocument();
    expect(screen.getByText("RUN")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nouvelle action"), "Investiguer les droits d'accès");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(await screen.findByText("Investiguer les droits d'accès")).toBeInTheDocument();

    // Retour à la liste : la carte reflète le nombre d'actions.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(await screen.findByText(/1 action/)).toBeInTheDocument();
  });

  it("changer l'approche ne fait disparaître aucune action existante", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await screen.findByText("Aucun espace pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Espace test");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    await user.type(screen.getByLabelText("Nouvelle action"), "Action persistante");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await screen.findByText("Action persistante");

    await user.click(screen.getByRole("button", { name: "Paramètres de l'espace" }));
    await user.click(screen.getByText("Management", { selector: "span" }));
    // Cet espace RUN démarre en it_ops : passer à management masque des
    // champs (catégorie, priorité, attente, récurrence) -> confirmation requise.
    await user.click(
      screen.getByRole("checkbox", { name: /Je confirme malgré le masquage/ })
    );
    await user.click(screen.getByRole("button", { name: "Appliquer l'approche" }));

    // De retour sur l'espace, l'action est toujours là.
    expect(await screen.findByText("Action persistante")).toBeInTheDocument();
  });
});
