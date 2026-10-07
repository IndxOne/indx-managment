import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStateForTests } from "./hooks/useAuthState";
import { App } from "./App";

vi.mock("./adapters/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({}),
}));
// Le test de navigation conserve le vrai HomeScreen, le hook et AuthScreen ;
// seul l'adaptateur de persistance est remplacé pour éviter tout accès réseau.
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

beforeEach(() => resetAuthStateForTests());
afterEach(() => resetAuthStateForTests());

describe("App — connexion unique depuis l'Accueil", () => {
  it("ouvre le formulaire OTP existant et conserve la barre basse et le menu secondaire", async () => {
    const user = userEvent.setup();
    render(<App />);
    const signIn = await screen.findByRole("button", { name: "Se connecter" });
    expect(screen.getAllByRole("button", { name: /Se connecter/ })).toHaveLength(1);
    for (const name of [/Accueil/, /^RUN/, /Projets/, /Réglages/, /Menu secondaire/]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await user.click(signIn);
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Envoyer/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Accueil/ }));
    expect(await screen.findByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Menu secondaire/ }));
    expect(await screen.findByRole("button", { name: "Mon Brief" })).toBeInTheDocument();
  });
});
