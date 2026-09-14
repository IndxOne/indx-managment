import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Caractérisation du client Supabase actuel (Lot 0) : isConfigured(),
 * en-tête x-user-hash attaché au client, mémoïsation. Mock complet de
 * @supabase/supabase-js — aucun appel réseau réel. import.meta.env est
 * réécrit via vi.stubEnv puis le module est réimporté à chaud
 * (vi.resetModules) car SUPABASE_URL/KEY sont lus une seule fois, au
 * chargement du module (cf. client.ts:4-5).
 */

const createClientMock = vi.fn(() => ({ __mockSupabaseClient: true }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("./user-hash", () => ({
  getOrCreateUserHash: () => "hash-de-test",
}));

beforeEach(() => {
  createClientMock.mockClear();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSupabaseConfigured", () => {
  it("est faux quand les deux variables d'env sont vides (cas des tests, cf. vite.config.ts)", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { isSupabaseConfigured } = await import("./client");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("est faux si seule l'URL est renseignée", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { isSupabaseConfigured } = await import("./client");

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("est vrai quand les deux variables sont renseignées", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
    const { isSupabaseConfigured } = await import("./client");

    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("getSupabaseClient", () => {
  it("lève une erreur explicite si Supabase n'est pas configuré", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { getSupabaseClient } = await import("./client");

    expect(() => getSupabaseClient()).toThrow(/Supabase non configuré/);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("attache le header x-user-hash courant à la création du client", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
    const { getSupabaseClient } = await import("./client");

    getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://exemple.supabase.co",
      "cle-publique-de-test",
      { global: { headers: { "x-user-hash": "hash-de-test" } } }
    );
  });

  it("mémoïse le client : deux appels ne créent qu'une seule instance", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
    const { getSupabaseClient } = await import("./client");

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});
