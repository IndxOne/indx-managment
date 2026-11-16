import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ auth: { status: "authenticated", authUserId: "u1" } as { status: string; authUserId?: string }, findProjectById: vi.fn(), rpc: vi.fn() }));
vi.mock("../hooks/useAuthState", () => ({ useAuthState: () => m.auth }));
vi.mock("../adapters/supabase/client", () => ({ getSupabaseClient: () => ({ rpc: m.rpc }) }));
vi.mock("../../infrastructure/persistence/v3/repositories/project-repository", () => ({ findProjectById: m.findProjectById }));

import { useCreateProjectAccess, useProjectWriteAccess } from "./useWriteAccess";

beforeEach(() => {
  vi.clearAllMocks();
  m.auth = { status: "authenticated", authUserId: "u1" };
});

describe("useProjectWriteAccess", () => {
  it("rôle editor : écriture autorisée", async () => {
    m.findProjectById.mockResolvedValue({ ok: true, value: { workspaceId: "ws1" } });
    m.rpc.mockResolvedValue({ data: "editor", error: null });
    const { result } = renderHook(() => useProjectWriteAccess("p1"));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current).toMatchObject({ canWrite: true, authUserId: "u1" });
  });
  it("rôle viewer : lecture seule", async () => {
    m.findProjectById.mockResolvedValue({ ok: true, value: { workspaceId: "ws1" } });
    m.rpc.mockResolvedValue({ data: "viewer", error: null });
    const { result } = renderHook(() => useProjectWriteAccess("p1"));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.canWrite).toBe(false);
  });
  it("exception du client : jamais d'écriture, aucune erreur non gérée", async () => {
    m.findProjectById.mockRejectedValue(new TypeError("client.from is not a function"));
    const { result } = renderHook(() => useProjectWriteAccess("p1"));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.canWrite).toBe(false);
  });
  it("sans session : aucune vérification, aucune écriture", async () => {
    m.auth = { status: "unauthenticated" };
    const { result } = renderHook(() => useProjectWriteAccess("p1"));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.canWrite).toBe(false);
    expect(m.findProjectById).not.toHaveBeenCalled();
  });
});

describe("useCreateProjectAccess", () => {
  it("exception : pas d'espace, pas de geste", async () => {
    m.rpc.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCreateProjectAccess(["a"]));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.canWrite).toBe(false);
  });
  it("aucun espace connu : pas d'appel réseau", () => {
    const { result } = renderHook(() => useCreateProjectAccess([]));
    expect(result.current.canWrite).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
