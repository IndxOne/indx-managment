import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Récurrence — parcours bout en bout (jsdom)", () => {
  it("créer une action répétée matérialise plusieurs occurrences, visibles jusqu'à ce qu'on arrête la récurrence", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(screen.getByRole("button", { name: /Projets/ }));
    await screen.findByText("Aucun espace pour l'instant");
    await user.click(screen.getByRole("button", { name: "Créer un espace" }));
    await user.type(screen.getByLabelText("Nom de l'espace"), "Suivi quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));
    await screen.findByRole("heading", { name: "Suivi quotidien" });

    await user.click(screen.getByRole("button", { name: /Options avancées/ }));
    await user.type(screen.getByLabelText("Titre"), "Vérifier les sauvegardes");
    await user.click(screen.getByLabelText("Répéter cette action"));
    await user.selectOptions(screen.getByLabelText("Fréquence"), "daily");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    // La règle matérialise l'occurrence du jour immédiatement.
    expect(await screen.findByText("Vérifier les sauvegardes")).toBeInTheDocument();

    // La règle apparaît dans les réglages de l'espace, avec un moyen de l'arrêter.
    await user.click(screen.getByRole("button", { name: "Paramètres de l'espace" }));
    expect(await screen.findByText("Récurrences actives")).toBeInTheDocument();
    const ruleCard = screen.getByText("Vérifier les sauvegardes").closest(".action-card");
    expect(ruleCard).not.toBeNull();
    expect(within(ruleCard as HTMLElement).getByText(/Quotidienne/)).toBeInTheDocument();

    await user.click(within(ruleCard as HTMLElement).getByRole("button", { name: "Arrêter" }));
    expect(screen.queryByText("Récurrences actives")).not.toBeInTheDocument();
  });
});
