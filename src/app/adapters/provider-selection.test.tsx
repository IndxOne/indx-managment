import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";

/**
 * Caractérisation du choix de provider (Lot 0) : App.tsx sélectionne
 * SupabaseStoreProvider ou TemporaryStoreProvider selon isSupabaseConfigured()
 * (cf. App.tsx ~L273). Différence observable sans dépendre des détails
 * internes : TemporaryStoreProvider démarre avec isLoading=false (jamais de
 * skeleton de chargement), SupabaseStoreProvider démarre en "loading" tant
 * que sa promesse de lecture n'est pas résolue (cf. temporary-store.tsx:36
 * et supabase-store.tsx status initial "loading").
 */

let mockConfigured = false;

function makePendingSupabaseClient() {
  return {
    rpc: async () => ({ data: {}, error: null }),
    from() {
      return {
        select: () => ({
          order: () => new Promise(() => {}), // ne résout jamais : garde le skeleton visible
          maybeSingle: () => new Promise(() => {}),
        }),
      };
    },
  };
}

vi.mock("./supabase/client", () => ({
  getSupabaseClient: () => makePendingSupabaseClient(),
  isSupabaseConfigured: () => mockConfigured,
}));

vi.mock("./supabase/user-hash", () => ({
  getOrCreateUserHash: () => "hash-de-test",
}));

vi.mock("./supabase/auth", () => ({
  getCurrentAuthUserId: async () => "auth-uid-test",
  onAuthStateChange: () => () => {},
}));

describe("App — choix du provider selon isSupabaseConfigured()", () => {
  it("Supabase configuré : passe par SupabaseStoreProvider (skeleton de chargement affiché)", async () => {
    mockConfigured = true;

    await act(async () => {
      render(<App />);
    });

    expect(await screen.findByText("Chargement des espaces…")).toBeInTheDocument();
  });

  it("Supabase non configuré : passe par TemporaryStoreProvider (jamais de skeleton, contenu immédiat)", async () => {
    mockConfigured = false;

    await act(async () => {
      render(<App />);
    });

    expect(screen.queryByText("Chargement des espaces…")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Accueil/ })).toBeInTheDocument();
  });
});
