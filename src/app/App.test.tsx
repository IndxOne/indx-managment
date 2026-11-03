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
    await screen.findByRole("button", { name: /^Aujourd'hui$/ });
    // L'onglet "Projets" ouvre désormais la vue Project V3 (UX-3) ; la
    // création d'espaces Workspace V2 (RUN/PROJET) reste accessible via le
    // lien legacy — comportement V2 inchangé, seul le chemin d'accès change.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(await screen.findByRole("button", { name: "Anciens espaces projet" }));
    expect(await screen.findByText("Aucun projet pour l'instant")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN SI quotidien");
    await user.click(screen.getByLabelText("Suivi au quotidien"));
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    // Navigation immédiate vers l'écran RUN de l'espace créé.
    expect(await screen.findByRole("heading", { name: "RUN SI quotidien" })).toBeInTheDocument();
    // "RUN" apparaît maintenant aussi comme onglet primaire de la barre basse
    // (cadrage renouveau mobile Lot A) — on cible ici précisément le badge de
    // nature d'espace, pas le libellé de l'onglet.
    expect(screen.getByText("Espace de suivi")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nouvelle action"), "Investiguer les droits d'accès");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(await screen.findByText("Investiguer les droits d'accès")).toBeInTheDocument();

    // Un seul espace RUN existant : l'onglet RUN saute directement dedans
    // (pas de card résumé) — vérifie que l'action créée s'y retrouve bien,
    // et n'apparaît jamais dans "Projets" (QA post-prod 2026-09-17 : un
    // espace RUN ne doit plus jamais lister dans l'onglet Projets).
    await user.click(screen.getByRole("button", { name: /^Espaces$/ }));
    expect(await screen.findByText("Investiguer les droits d'accès")).toBeInTheDocument();

    // L'onglet "Projets" ouvre désormais la vue Project V3 (UX-3) ; la
    // création d'espaces Workspace V2 (RUN/PROJET) reste accessible via le
    // lien legacy — comportement V2 inchangé, seul le chemin d'accès change.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(await screen.findByRole("button", { name: "Anciens espaces projet" }));
    expect(screen.queryByText("RUN SI quotidien")).not.toBeInTheDocument();
  });

  it("changer l'approche ne fait disparaître aucune action existante", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /^Aujourd'hui$/ });
    // L'onglet "Projets" ouvre désormais la vue Project V3 (UX-3) ; la
    // création d'espaces Workspace V2 (RUN/PROJET) reste accessible via le
    // lien legacy — comportement V2 inchangé, seul le chemin d'accès change.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(await screen.findByRole("button", { name: "Anciens espaces projet" }));
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

    await screen.findByRole("button", { name: /^Aujourd'hui$/ });
    // L'onglet "Projets" ouvre désormais la vue Project V3 (UX-3) ; la
    // création d'espaces Workspace V2 (RUN/PROJET) reste accessible via le
    // lien legacy — comportement V2 inchangé, seul le chemin d'accès change.
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await user.click(await screen.findByRole("button", { name: "Anciens espaces projet" }));
    await user.click(screen.getByRole("button", { name: "Créer un projet" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "RUN quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "RUN quotidien" });

    // Retour à Accueil, puis l'onglet RUN doit rouvrir directement l'espace,
    // sans passer par une liste intermédiaire.
    await user.click(screen.getByRole("button", { name: /^Aujourd'hui$/ }));
    await user.click(screen.getByRole("button", { name: /^Espaces$/ }));
    expect(await screen.findByRole("heading", { name: "RUN quotidien" })).toBeInTheDocument();
  });

  it("compositeur : écrire comme on parle crée l'action au bon moment, sans espace préalable", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(await screen.findByLabelText("Créer une action"), "Appeler Paul demain !");
    // Aperçu vivant de ce que l'app a compris.
    expect(screen.getByText("Demain")).toBeInTheDocument();
    expect(screen.getByText("Prioritaire")).toBeInTheDocument();
    expect(screen.getByText("Mes actions")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("Ajoutée à Mes actions · Demain")).toBeInTheDocument();
    expect(screen.getByLabelText("Créer une action")).toHaveValue("");
    // Le Flux la range dans "Bientôt", et elle devient le focus (journée libre).
    expect(await screen.findByRole("button", { name: "Appeler Paul" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Espaces$/ }));
    expect(await screen.findByRole("heading", { name: "Mes actions" })).toBeInTheDocument();
  });

  it("compositeur : #espace cible un espace existant, ou le crée s'il n'existe pas", async () => {
    const user = userEvent.setup();
    render(<App />);

    const composer = await screen.findByLabelText("Créer une action");
    await user.type(composer, "Rédiger le brief #mariage{Enter}");
    expect(await screen.findByText("Ajoutée à Mariage")).toBeInTheDocument();

    await user.type(composer, "Choisir le traiteur #mari");
    expect(screen.getByText("Mariage", { selector: ".composer-chip" })).toBeInTheDocument();
    await user.type(composer, "{Enter}");
    expect(await screen.findByText("Ajoutée à Mariage")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Espaces$/ }));
    expect(await screen.findByRole("heading", { name: "Mariage" })).toBeInTheDocument();
    expect(screen.getByText("Choisir le traiteur")).toBeInTheDocument();
  });
});
