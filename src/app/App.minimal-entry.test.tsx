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
  it("la barre de navigation fonctionnelle est conservée et l'onglet Projets rend la même surface", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "Mes projets" });
    await userEvent.click(screen.getByRole("button", { name: /Projets/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Accueil/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
  });
  it("le bouton Se connecter ouvre le parcours de connexion existant", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /Se connecter/ }));
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
  });
});
