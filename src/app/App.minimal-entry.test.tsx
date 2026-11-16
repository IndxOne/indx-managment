import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStateForTests } from "./hooks/useAuthState";
import { App } from "./App";

vi.mock("./adapters/supabase/client", () => ({ isSupabaseConfigured: () => true, getSupabaseClient: () => ({}) }));
vi.mock("./adapters/supabase-store", async () => {
  const { TemporaryStoreProvider } = await import("./adapters/temporary-store");
  return { SupabaseStoreProvider: TemporaryStoreProvider };
});
vi.mock("./adapters/supabase/auth", () => ({
  getCurrentAuthUserId: async () => null,
  onAuthStateChange: () => () => {},
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}));

beforeEach(() => {
  import.meta.env.VITE_UX_MINIMAL = "on";
  resetAuthStateForTests();
});
afterEach(() => {
  import.meta.env.VITE_UX_MINIMAL = "off";
  resetAuthStateForTests();
});

describe("App — entrée minimale « Mes projets » (mode minimal)", () => {
  it("l'entrée est Mes projets, déconnecté : un seul CTA, aucune section de l'ancien Accueil", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Se connecter/ })).toHaveLength(1);
    for (const old of ["Mon Brief", "Mes projets V3"]) expect(screen.queryByRole("heading", { name: old })).not.toBeInTheDocument();
    expect(screen.queryByText("Voir la semaine complète")).not.toBeInTheDocument();
  });
  it("aucune navigation historique : ni barre du bas, ni « ••• », ni sidebar, ni lien Plus", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mes projets" });
    for (const name of [/^RUN/, /Réglages/, /Projets$/, /Accueil/, /Menu secondaire/, /Plus/, /Nouvelle action/, /Mon Brief/]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
  it("en-tête : le CTA ouvre la connexion existante ; le retour ramène à Mes projets, pas aux Réglages", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retour aux réglages" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retour à Mes projets" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
  });
  it("la marque de l'en-tête ramène à Mes projets depuis la connexion", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Se connecter" }));
    await screen.findByRole("heading", { name: "Connexion" });
    await userEvent.click(screen.getByRole("button", { name: /Management, retour à Mes projets/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
  });
});
