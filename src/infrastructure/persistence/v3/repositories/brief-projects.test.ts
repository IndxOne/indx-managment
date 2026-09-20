import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { listBriefProjects } from "./brief-projects";

type Row = Record<string, unknown>;

interface MockCall {
  table: string;
  selectedColumns: string | null;
}

/** Faux client Supabase minimal, sur le même patron que brief-reader.test.ts :
 * comptabilise l'appel .from() effectivement résolu, et jamais une entité
 * fille (aucune table autre que projets_v3_projects n'est jamais interrogée). */
function createMockClient(rows: Row[], error: { code?: string; message: string } | null = null) {
  const calls: MockCall[] = [];

  function from(table: string) {
    let selectedColumns: string | null = null;
    const builder = {
      select(columns: string) {
        selectedColumns = columns;
        return builder;
      },
      then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown, onRejected?: (reason: unknown) => unknown) {
        calls.push({ table, selectedColumns });
        const result = error ? { data: null, error } : { data: rows, error: null };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("listBriefProjects", () => {
  it("retourne uniquement id/name/status, jamais l'entité Project complète ni une entité fille", async () => {
    const { client, calls } = createMockClient([
      { id: "p1", name: "Migration M365", status: "on_track" },
      { id: "p2", name: "Refonte site client", status: "at_risk" },
    ]);

    const result = await listBriefProjects(client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        { id: "p1", name: "Migration M365", status: "on_track" },
        { id: "p2", name: "Refonte site client", status: "at_risk" },
      ]);
    }
    expect(calls).toEqual([{ table: "projets_v3_projects", selectedColumns: "id, name, status" }]);
  });

  it("n'interroge jamais une autre table que projets_v3_projects (aucune entité fille chargée)", async () => {
    const { client, calls } = createMockClient([]);
    await listBriefProjects(client);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.table).toBe("projets_v3_projects");
  });

  it("s'appuie entièrement sur la RLS existante : aucun filtre explicite n'est ajouté côté application", async () => {
    const { client, calls } = createMockClient([]);
    await listBriefProjects(client);
    // select() sans .eq() : la visibilité est entièrement déléguée à la
    // politique RLS de la table, jamais recalculée applicativement ici.
    expect(calls[0]!.selectedColumns).toBe("id, name, status");
  });

  it("propage une erreur RLS/autorisation comme PersistenceError typée, jamais lancée", async () => {
    const { client } = createMockClient([], { code: "42501", message: "permission denied for table projets_v3_projects" });
    const result = await listBriefProjects(client);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("authorization");
    }
  });

  it("propage une erreur technique inconnue comme PersistenceError persistance/unknown, jamais lancée", async () => {
    const { client } = createMockClient([], { code: "08006", message: "connection refused" });
    const result = await listBriefProjects(client);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "persistence", code: "unknown", message: "connection refused" });
    }
  });

  it("retourne un tableau vide (pas une erreur) quand aucun projet n'est visible", async () => {
    const { client } = createMockClient([]);
    const result = await listBriefProjects(client);
    expect(result).toEqual({ ok: true, value: [] });
  });
});
