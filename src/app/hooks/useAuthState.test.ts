import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authStateKey, resetAuthStateForTests, useAuthState } from "./useAuthState";

vi.mock("../adapters/supabase/client", () => ({
  isSupabaseConfigured: () => true,
}));

let getCurrentAuthUserIdMock: ReturnType<typeof vi.fn>;
let authStateChangeListeners: Set<(authUserId: string | null) => void>;
vi.mock("../adapters/supabase/auth", () => ({
  getCurrentAuthUserId: (...args: unknown[]) => getCurrentAuthUserIdMock(...args),
  onAuthStateChange: (listener: (authUserId: string | null) => void) => {
    authStateChangeListeners.add(listener);
    return () => authStateChangeListeners.delete(listener);
  },
}));

beforeEach(() => {
  resetAuthStateForTests();
  authStateChangeListeners = new Set();
  getCurrentAuthUserIdMock = vi.fn();
});
afterEach(() => {
  resetAuthStateForTests();
});

/**
 * Correctif review (PR #66) : la lecture initiale `getCurrentAuthUserId()`
 * et l'abonnement `onAuthStateChange()` démarrent en parallèle sans garantie
 * d'ordre. Si un événement (ex. logout rapide juste après montage) arrive
 * AVANT que la lecture initiale ne résolve, cette dernière ne doit jamais
 * écraser l'état plus récent avec une session obsolète.
 */
describe("useAuthState — course entre la lecture initiale et un événement Auth", () => {
  it("un événement arrivé avant la résolution de la lecture initiale n'est jamais écrasé par celle-ci", async () => {
    let resolveInitialRead!: (authUserId: string | null) => void;
    getCurrentAuthUserIdMock.mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveInitialRead = resolve;
      })
    );

    const { result } = renderHook(() => useAuthState());
    expect(result.current.status).toBe("loading");

    // L'événement (logout) arrive avant que la lecture initiale ne résolve.
    for (const listener of authStateChangeListeners) listener(null);
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));

    // La lecture initiale (obsolète) résout ensuite avec un utilisateur —
    // elle ne doit jamais écraser l'état "unauthenticated" plus récent.
    resolveInitialRead("stale-user");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.status).toBe("unauthenticated");
  });

  it("sans événement concurrent, la lecture initiale détermine bien l'état", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue("user-1");
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current).toEqual({ status: "authenticated", authUserId: "user-1" });
  });
});

/**
 * Correctif review (PR #66) : un changement direct d'utilisateur authentifié
 * (compte A -> compte B, sans repasser par "loading"/"unauthenticated") doit
 * produire une clé de dépendance différente, sans quoi les écrans V3
 * n'auraient jamais rechargé leurs données pour le nouveau compte.
 */
describe("authStateKey — clé de dépendance stable pour useEffect", () => {
  it("diffère entre deux utilisateurs authentifiés différents", () => {
    const keyA = authStateKey({ status: "authenticated", authUserId: "user-a" });
    const keyB = authStateKey({ status: "authenticated", authUserId: "user-b" });
    expect(keyA).not.toBe(keyB);
  });

  it("est stable pour le même utilisateur authentifié", () => {
    const key1 = authStateKey({ status: "authenticated", authUserId: "user-a" });
    const key2 = authStateKey({ status: "authenticated", authUserId: "user-a" });
    expect(key1).toBe(key2);
  });

  it("diffère entre loading/unauthenticated/unconfigured", () => {
    const keys = new Set([
      authStateKey({ status: "loading" }),
      authStateKey({ status: "unauthenticated" }),
      authStateKey({ status: "unconfigured" }),
    ]);
    expect(keys.size).toBe(3);
  });
});
