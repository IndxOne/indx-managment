import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App — parcours mobile bout en bout (jsdom)", () => {
  it("créer un espace RUN, voir sa carte, l'ouvrir, ajouter une action", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Porte de démarrage : le contenu réel apparaît après le premier effet.
    // L'app s'ouvre désormais sur Aujourd'hui (Home) — on rejoint Projets pour
    // créer un espace (décision produit validée, Lot 1 du renouveau produit).
    await screen.findByRole("button", { name: /Aujourd.hui/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(await screen.findByText("Aucun espace pour l'instant")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN SI quotidien");
    await user.click(screen.getByLabelText("Travail continu (RUN)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    // Navigation immédiate vers l'écran RUN de l'espace créé.
    expect(await screen.findByRole("heading", { name: "RUN SI quotidien" })).toBeInTheDocument();
    // Deux "RUN" à l'écran depuis le renouveau v2.2 (badge d'espace + onglet
    // RUN de la barre basse) : on cible le badge, seul élément garanti dans
    // ce test-là.
    expect(screen.getByText("RUN", { selector: "span.badge-run" })).toBeInTheDocument();

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

    await screen.findByRole("button", { name: /Aujourd.hui/ });
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

describe("App — barre basse mobile v2.2 (Aujourd'hui / RUN / création rapide / Projets / Réglages)", () => {
  it("navigue Aujourd'hui → RUN → Projets → Réglages", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Aujourd.hui/ });

    // Crée un espace RUN pour que l'onglet RUN ait une cible directe (cas
    // "un seul espace RUN" — cf. handleNavChange dans App.tsx).
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Support quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    expect(await screen.findByRole("heading", { name: "Support quotidien" })).toBeInTheDocument();

    // Aujourd'hui.
    await user.click(screen.getByRole("button", { name: /Aujourd.hui/ }));
    expect(await screen.findByRole("heading", { name: "Accueil" })).toBeInTheDocument();

    // RUN : un seul espace RUN -> va dessus directement, pas une liste à filtrer.
    await user.click(screen.getByRole("button", { name: /^RUN$/ }));
    expect(await screen.findByRole("heading", { name: "Support quotidien" })).toBeInTheDocument();

    // Projets.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(await screen.findByRole("heading", { name: "Mes projets" })).toBeInTheDocument();

    // Réglages.
    await user.click(screen.getByRole("button", { name: "Réglages" }));
    expect(await screen.findByRole("heading", { name: "Réglages" })).toBeInTheDocument();
  });

  it("l'onglet RUN ouvre la liste filtrée quand il n'existe encore aucun espace RUN", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Aujourd.hui/ });
    await user.click(screen.getByRole("button", { name: /^RUN$/ }));

    expect(await screen.findByRole("heading", { name: "Mes espaces RUN" })).toBeInTheDocument();
    expect(screen.getByText("Aucun espace RUN pour l'instant")).toBeInTheDocument();
  });

  it("création rapide (bouton central) : crée une Action RUN et la retrouve dans l'espace RUN", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Aujourd.hui/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Support quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "Support quotidien" });

    await user.click(screen.getByRole("button", { name: "Créer une action ou un projet" }));
    expect(screen.getByRole("radio", { name: "Action RUN" })).toBeChecked();
    await user.type(screen.getByLabelText("Titre"), "Investiguer un incident");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    await user.click(screen.getByRole("button", { name: /^RUN$/ }));
    expect(await screen.findByText("Investiguer un incident")).toBeInTheDocument();
  });

  it("création rapide (bouton central) : crée une Tâche Projet sur le projet choisi", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Aujourd.hui/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Refonte CRM");
    await user.click(screen.getByLabelText("Projet avec étapes (PROJET)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "Refonte CRM" });

    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer une action ou un projet" }));
    await user.click(screen.getByRole("radio", { name: "Tâche Projet" }));
    await user.type(screen.getByLabelText("Titre"), "Rédiger le cahier des charges");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    await user.click(screen.getByText("Refonte CRM"));
    expect(await screen.findByText("Rédiger le cahier des charges")).toBeInTheDocument();
  });
});

describe("App — desktop (v2.2 : pas de bouton central flottant, sidebar complète)", () => {
  function stubDesktop() {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    vi.stubGlobal("matchMedia", matchMedia);
  }

  it("n'affiche pas le bouton central mobile ; \"Nouvelle action\" vit dans la sidebar", async () => {
    stubDesktop();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    expect(screen.queryByRole("button", { name: "Créer une action ou un projet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle action" })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
