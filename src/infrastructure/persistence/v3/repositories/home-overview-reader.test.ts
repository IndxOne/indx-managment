import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readHomeOverview } from "./home-overview-reader";

const NOW = "2026-09-20T08:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";

type Row = Record<string, unknown>;

interface MockCall {
  table: string;
  eqFilters: [string, unknown][];
  inFilters: [string, unknown[]][];
  neqFilters: [string, unknown][];
  order?: { col: string; ascending: boolean };
  limit?: number;
}

/**
 * Même patron que brief-reader.test.ts, étendu avec .neq()/.in()/.order()/
 * .limit() — nécessaires pour vérifier le budget de requêtes de
 * readHomeOverview (liste bornée + 8 requêtes batchées `.in()`).
 */
function createMockClient(tableRows: Record<string, Row[]>, errors: Partial<Record<string, { code?: string; message: string }>> = {}) {
  const calls: MockCall[] = [];

  function from(table: string) {
    const eqFilters: [string, unknown][] = [];
    const inFilters: [string, unknown[]][] = [];
    const neqFilters: [string, unknown][] = [];
    let order: MockCall["order"];
    let limit: number | undefined;

    async function resolve() {
      calls.push({ table, eqFilters: [...eqFilters], inFilters: [...inFilters], neqFilters: [...neqFilters], order, limit });
      if (errors[table]) return { data: null, error: errors[table] };
      let rows = tableRows[table] ?? [];
      for (const [col, val] of eqFilters) rows = rows.filter((r) => r[col] === val);
      for (const [col, val] of neqFilters) rows = rows.filter((r) => r[col] !== val);
      for (const [col, vals] of inFilters) rows = rows.filter((r) => vals.includes(r[col]));
      if (order) {
        const { col, ascending } = order;
        rows = [...rows].sort((a, b) => {
          const av = a[col] as string;
          const bv = b[col] as string;
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
        });
      }
      if (limit !== undefined) rows = rows.slice(0, limit);
      return { data: rows, error: null };
    }

    const builder = {
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        eqFilters.push([col, val]);
        return builder;
      },
      neq(col: string, val: unknown) {
        neqFilters.push([col, val]);
        return builder;
      },
      in(col: string, vals: unknown[]) {
        inFilters.push([col, vals]);
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        order = { col, ascending: opts?.ascending ?? true };
        return builder;
      },
      limit(n: number) {
        limit = n;
        return builder;
      },
      then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown, onRejected?: (reason: unknown) => unknown) {
        return resolve().then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient, calls };
}

function projectRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "p1",
    workspace_id: "w1",
    name: "Migration M365",
    sponsor: null,
    project_manager: null,
    method: "predictive",
    criticality: "high",
    status: "on_track",
    target_date: null,
    forecast_date: null,
    current_stage_id: null,
    created_at: NOW,
    updated_at: NOW,
    last_reviewed_at: null,
    ...overrides,
  };
}

function workItemRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "wi1",
    project_id: "p1",
    workspace_id: "w1",
    type: "task",
    title: "Configurer VPN",
    responsible_id: null,
    status: "to_scope",
    priority: "normal",
    due_date: null,
    exit_condition: null,
    expected_result: null,
    acceptance_criteria: [],
    milestone_id: null,
    blocked_reason: null,
    blocked_next_step: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function milestoneRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "m1",
    project_id: "p1",
    workspace_id: "w1",
    stage_id: null,
    observable_result: "Design validé",
    target_date: "2026-10-01T00:00:00.000Z",
    forecast_date: null,
    acceptance_criteria: [{ description: "x", satisfied: true }],
    approver_id: null,
    status: "planned",
    created_at: NOW,
    updated_at: NOW,
    reviewed_at: null,
    ...overrides,
  };
}

describe("readHomeOverview — budget de requêtes (absence structurelle de N+1)", () => {
  it("exactement 9 requêtes pour 1 seul projet chargé", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow()],
    });
    await readHomeOverview(client, NOW);
    expect(calls).toHaveLength(9);
  });

  it("exactement 9 requêtes pour 5 projets chargés — jamais 5x plus", async () => {
    const projects = Array.from({ length: 5 }, (_, i) => projectRow({ id: `p${i}`, updated_at: NOW }));
    const { client, calls } = createMockClient({ projets_v3_projects: projects });
    await readHomeOverview(client, NOW);
    expect(calls).toHaveLength(9);
    // Chacune des 8 collections n'est interrogée qu'une seule fois, avec un
    // filtre .in() portant tous les projets — jamais un .eq() par projet.
    for (const table of [
      "projets_v3_work_items",
      "projets_v3_decisions",
      "projets_v3_risks",
      "projets_v3_issues",
      "projets_v3_milestones",
      "projets_v3_evidence",
      "projets_v3_dependencies",
      "projets_v3_change_requests",
    ]) {
      const callsForTable = calls.filter((c) => c.table === table);
      expect(callsForTable).toHaveLength(1);
      expect(callsForTable[0]!.inFilters).toEqual(
        table === "projets_v3_evidence" ? [["project_id", ["p0", "p1", "p2", "p3", "p4"]]] : [["project_id", ["p0", "p1", "p2", "p3", "p4"]]]
      );
    }
  });

  it("1 seule requête (liste projets) quand aucun projet n'est retourné", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [] });
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ generatedAt: NOW, attentionItems: [], projects: [] });
    expect(calls).toHaveLength(1);
  });
});

describe("readHomeOverview — liste des projets", () => {
  it("exclut les projets clôturés (.neq status closed) et trie updated_at desc, limite 5", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [
        projectRow({ id: "old", updated_at: "2026-01-01T00:00:00.000Z" }),
        projectRow({ id: "closed", status: "closed", updated_at: "2026-09-19T00:00:00.000Z" }),
        projectRow({ id: "recent", updated_at: "2026-09-19T12:00:00.000Z" }),
      ],
    });
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projects.map((p) => p.id)).toEqual(["recent", "old"]);

    const projectCall = calls.find((c) => c.table === "projets_v3_projects")!;
    expect(projectCall.neqFilters).toEqual([["status", "closed"]]);
    expect(projectCall.order).toEqual({ col: "updated_at", ascending: false });
    expect(projectCall.limit).toBe(5);
  });
});

describe("readHomeOverview — composition", () => {
  it("agrège un Brief par projet via buildBrief (réutilisé, pas recalculé) et le prochain jalon", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow({ id: "p1" })],
      projets_v3_work_items: [workItemRow({ id: "wi1", status: "to_scope" })],
      projets_v3_milestones: [milestoneRow({ id: "m1", target_date: "2026-10-05T00:00:00.000Z" })],
    });
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projects).toHaveLength(1);
    expect(result.value.projects[0]!.needsAttention).toBe(true);
    expect(result.value.projects[0]!.nextMilestone?.id).toBe("m1");
    expect(result.value.attentionItems.length).toBeGreaterThan(0);
  });

  it("aucun compteur global partiel dans la projection retournée", async () => {
    const { client } = createMockClient({ projets_v3_projects: [projectRow()] });
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty("briefItemCount");
  });

  it("now transmis jusqu'à buildBrief (ACT-005 en retard)", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow({ id: "p1" })],
      projets_v3_work_items: [workItemRow({ status: "in_progress", responsible_id: "user-a", due_date: PAST })],
    });
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attentionItems).toEqual([expect.objectContaining({ ruleId: "ACT-005" })]);
  });
});

describe("readHomeOverview — propagation d'erreur", () => {
  it("erreur sur la liste des projets : propagée, aucune autre requête", async () => {
    const { client, calls } = createMockClient(
      { projets_v3_projects: [] },
      { projets_v3_projects: { code: "42501", message: "permission denied" } }
    );
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("erreur sur une collection batchée : propagée telle quelle", async () => {
    const { client } = createMockClient(
      { projets_v3_projects: [projectRow()] },
      { projets_v3_risks: { code: "42501", message: "permission denied" } }
    );
    const result = await readHomeOverview(client, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "authorization", message: "permission denied" });
  });
});

describe("readHomeOverview — aucun accès Objective/Stage", () => {
  it("jamais de requête sur projets_v3_objectives ou projets_v3_stages", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [projectRow()] });
    await readHomeOverview(client, NOW);
    expect(calls.some((c) => c.table === "projets_v3_objectives")).toBe(false);
    expect(calls.some((c) => c.table === "projets_v3_stages")).toBe(false);
    expect(calls.some((c) => c.table === "projets_workspaces")).toBe(false);
  });
});
