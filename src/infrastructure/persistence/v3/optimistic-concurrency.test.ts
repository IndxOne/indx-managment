import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateWithOptimisticConcurrency } from "./optimistic-concurrency";

/** Faux client minimal reproduisant uniquement la chaîne utilisée par
 * updateWithOptimisticConcurrency : from().update().eq().eq().select().maybeSingle(). */
function fakeClient(maybeSingleResult: { data: unknown; error: { code?: string; message: string } | null }): SupabaseClient {
  const calls: { eq: [string, unknown][] } = { eq: [] };
  const builder = {
    update: (_patch: unknown) => builder,
    eq: (column: string, value: unknown) => {
      calls.eq.push([column, value]);
      return builder;
    },
    select: () => builder,
    maybeSingle: async () => maybeSingleResult,
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("updateWithOptimisticConcurrency", () => {
  it("retourne la ligne mise à jour quand updated_at correspond encore", async () => {
    const client = fakeClient({ data: { id: "1", updated_at: "2026-09-20T09:00:00.000Z" }, error: null });
    const result = await updateWithOptimisticConcurrency(client, "projets_v3_risks", "1", "2026-09-20T08:00:00.000Z", { status: "closed" });
    expect(result).toEqual({ ok: true, value: { id: "1", updated_at: "2026-09-20T09:00:00.000Z" } });
  });

  it("retourne stale_write quand aucune ligne ne correspond (écriture concurrente)", async () => {
    const client = fakeClient({ data: null, error: null });
    const result = await updateWithOptimisticConcurrency(client, "projets_v3_risks", "1", "2026-09-20T08:00:00.000Z", { status: "closed" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      kind: "persistence",
      code: "stale_write",
      message: "Écriture concurrente détectée sur projets_v3_risks (id=1) : updated_at ne correspond plus à la version lue.",
    });
  });

  it("traduit une erreur PostgREST plutôt que de la laisser fuiter telle quelle", async () => {
    const client = fakeClient({ data: null, error: { code: "42501", message: "RLS" } });
    const result = await updateWithOptimisticConcurrency(client, "projets_v3_risks", "1", "2026-09-20T08:00:00.000Z", { status: "closed" });
    expect(result).toEqual({ ok: false, error: { kind: "authorization", message: "RLS" } });
  });
});
