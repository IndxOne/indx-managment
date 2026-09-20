import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { App } from "./App";

/**
 * Fichier séparé de App.test.tsx : vi.mock est hoisté en tête de module, donc
 * mocker le client Supabase ici s'appliquerait à tout le fichier s'il
 * partageait le même — cassant les autres parcours qui reposent sur
 * TemporaryStoreProvider / Supabase non configuré.
 */
vi.mock("./adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => false,
}));

const listBriefProjectsMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/brief-projects", () => ({
  listBriefProjects: (...args: unknown[]) => listBriefProjectsMock(...args),
}));

const readBriefMock = vi.fn();
vi.mock("../infrastructure/persistence/v3/repositories/brief-reader", () => ({
  readBrief: (...args: unknown[]) => readBriefMock(...args),
}));

beforeEach(() => {
  listBriefProjectsMock.mockReset();
  readBriefMock.mockReset();
  readBriefMock.mockReturnValue(new Promise(() => {}));
});

describe("App — Mon Brief est joignable depuis le menu secondaire, sans changement de BottomNav", () => {
  it("0 projet accessible affiche l'EmptyState dédié, pas une erreur technique", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({ ok: true, value: [] });
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    // Les 4 emplacements primaires de BottomNav restent inchangés (cadrage
    // renouveau mobile Lot A) — Mon Brief n'y ajoute rien.
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RUN/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réglages/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mon Brief" })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
      })
    );
    await user.click(screen.getByRole("button", { name: "Mon Brief" }));

    expect(await screen.findByText("Aucun projet disponible pour le moment.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(await screen.findByRole("button", { name: "Mon Brief" })).toBeInTheDocument();
  });

  it("1 projet accessible ouvre directement le Brief correspondant", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({
      ok: true,
      value: [{ id: "p1", name: "Refonte site client", status: "active" }],
    });
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(
      screen.getByRole("button", {
        name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
      })
    );
    await user.click(screen.getByRole("button", { name: "Mon Brief" }));

    expect(await screen.findByText("Chargement de Mon Brief…")).toBeInTheDocument();
  });

  it("plusieurs projets accessibles affichent le sélecteur, une sélection ouvre le bon projectId", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({
      ok: true,
      value: [
        { id: "p1", name: "Refonte site client", status: "active" },
        { id: "p2", name: "Migration ERP", status: "active" },
      ],
    });
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(
      screen.getByRole("button", {
        name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
      })
    );
    await user.click(screen.getByRole("button", { name: "Mon Brief" }));

    expect(await screen.findByText("Choisir un projet")).toBeInTheDocument();
    expect(screen.getByText("Refonte site client")).toBeInTheDocument();
    expect(screen.getByText("Migration ERP")).toBeInTheDocument();

    await user.click(screen.getByText("Migration ERP"));
    expect(await screen.findByText("Chargement de Mon Brief…")).toBeInTheDocument();
  });

  it("erreur de lecture affiche l'ErrorState, jamais un écran vide silencieux", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "unknown", message: "connection refused" },
    });
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(
      screen.getByRole("button", {
        name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
      })
    );
    await user.click(screen.getByRole("button", { name: "Mon Brief" }));

    expect(await screen.findByText("Impossible de charger la liste des projets.")).toBeInTheDocument();
    expect(screen.queryByText(/connection refused/)).not.toBeInTheDocument();
  });

  it("appelle listBriefProjects avec le client Supabase courant, sans contournement de la RLS", async () => {
    const user = userEvent.setup();
    listBriefProjectsMock.mockResolvedValue({ ok: true, value: [] });
    render(<App />);

    await screen.findByRole("button", { name: /Accueil/ });
    await user.click(
      screen.getByRole("button", {
        name: "Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief",
      })
    );
    await user.click(screen.getByRole("button", { name: "Mon Brief" }));

    await screen.findByText("Aucun projet disponible pour le moment.");
    expect(listBriefProjectsMock).toHaveBeenCalledTimes(1);
    expect(listBriefProjectsMock).toHaveBeenCalledWith({});
  });
});
