import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemporaryStoreProvider } from "../adapters/temporary-store";
import { AppSettingsScreen } from "./AppSettingsScreen";

/**
 * Fichier séparé de AppSettingsScreen.test.tsx : vi.mock est hoisté en tête
 * de module, donc mocker isSupabaseConfigured() à true ici s'appliquerait à
 * tout le fichier s'il partageait le même — cassant l'hypothèse "Supabase
 * non configuré" des autres tests. Isolé, ce mock ne touche qu'ici.
 */
vi.mock("../adapters/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({}),
}));
vi.mock("../adapters/supabase/user-hash", () => ({
  getOrCreateUserHash: () => "test-hash",
  setUserHash: () => {},
}));

describe("AppSettingsScreen — accès à la connexion (Supabase configuré)", () => {
  afterEach(() => localStorage.clear());

  it("le bouton Connexion ouvre l'écran Auth sans jamais désactiver le code de synchronisation legacy", async () => {
    const user = userEvent.setup();
    const onOpenAuth = vi.fn();
    render(
      <TemporaryStoreProvider>
        <AppSettingsScreen onNavigate={() => {}} onOpenAuth={onOpenAuth} />
      </TemporaryStoreProvider>
    );

    // Le code de synchronisation legacy reste affiché et actif à côté du bouton Connexion.
    expect(screen.getByText("Code de synchronisation")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connexion" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });
});
