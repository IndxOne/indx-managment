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
    expect(await screen.findByText("Aucun projet pour l'instant")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN SI quotidien");
    await user.click(screen.getByLabelText("Travail continu (RUN)"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    // Navigation immédiate vers l'écran RUN de l'espace créé.
    expect(await screen.findByRole("heading", { name: "RUN SI quotidien" })).toBeInTheDocument();
    // "RUN" apparaît maintenant aussi comme onglet primaire de la barre basse
    // (cadrage renouveau mobile Lot A) — on cible ici précisément le badge de
    // nature d'espace, pas le libellé de l'onglet.
    expect(screen.getByText("RUN", { selector: ".badge-run" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nouvelle action"), "Investiguer les droits d'accès");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(await screen.findByText("Investiguer les droits d'accès")).toBeInTheDocument();

    // Un seul espace RUN existant : l'onglet RUN saute directement dedans
    // (pas de card résumé) — vérifie que l'action créée s'y retrouve bien,
    // et n'apparaît jamais dans "Projets" (QA post-prod 2026-09-17 : un
    // espace RUN ne doit plus jamais lister dans l'onglet Projets).
    await user.click(screen.getByRole("button", { name: /^RUN$/ }));
    expect(await screen.findByText("Investiguer les droits d'accès")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(screen.queryByText("RUN SI quotidien")).not.toBeInTheDocument();
  });

  it("changer l'approche ne fait disparaître aucune action existante", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await screen.findByText("Aucun projet pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
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

  it("l'onglet RUN saute directement dans l'espace RUN unique, sans étape de sélection (cadrage renouveau mobile Lot A)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "RUN quotidien" });

    // Retour à Accueil, puis l'onglet RUN doit rouvrir directement l'espace,
    // sans passer par une liste intermédiaire.
    await user.click(screen.getByRole("button", { name: /Accueil/ }));
    await user.click(screen.getByRole("button", { name: /^RUN/ }));
    expect(await screen.findByRole("heading", { name: "RUN quotidien" })).toBeInTheDocument();
  });

  it("le bouton central de création rapide ouvre « Que voulez-vous créer ? » puis crée une action RUN (Lot B, plus un placeholder)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "RUN quotidien" });

    await user.click(screen.getByRole("button", { name: /Accueil/ }));
    await user.click(screen.getByRole("button", { name: "Créer une action" }));

    // Un seul espace RUN existe : l'étape de sélection d'espace est sautée,
    // directement le formulaire (même règle que RunHubScreen).
    expect(await screen.findByText("Choisissez le type d'élément à créer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Action RUN/ }));
    await user.type(screen.getByLabelText("Titre"), "Créée depuis le bouton central");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(await screen.findByText(/créée dans RUN quotidien/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^RUN/ }));
    expect(await screen.findByText("Créée depuis le bouton central")).toBeInTheDocument();
  });

  it("« Que voulez-vous créer ? » propose une Tâche Projet rattachée au bon espace PROJET", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Refonte site client");
    await user.click(screen.getByLabelText(/Projet avec étapes/));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "Refonte site client" });

    await user.click(screen.getByRole("button", { name: /Accueil/ }));
    await user.click(screen.getByRole("button", { name: "Créer une action" }));

    expect(await screen.findByText("Choisissez le type d'élément à créer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Tâche Projet/ }));
    await user.type(screen.getByLabelText("Titre"), "Rédiger le brief");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(await screen.findByText(/créée dans Refonte site client/)).toBeInTheDocument();
  });

});
