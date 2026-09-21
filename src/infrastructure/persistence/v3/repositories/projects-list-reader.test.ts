import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readProjectsList } from "./projects-list-reader";

const NOW = "2026-09-20T08:00:00.000Z";

type Row = Record<string, unknown>;

interface MockCall {
  table: string;
  eqFilters: [string, unknown][];
  inFilters: [string, unknown[]][];
  order: { col: string; ascending: boolean }[];
  limit?: number;
  range?: [number, number];
}

function createMockClient(tableRows: Record<string, Row[]>, errors: Partial<Record<string, { code?: string; message: string }>> = {}) {
  const calls: MockCall[] = [];

  function from(table: string) {
    const eqFilters: [string, unknown][] = [];
    const inFilters: [string, unknown[]][] = [];
    const order: MockCall["order"] = [];
    let limit: number | undefined;
    let range: [number, number] | undefined;

    async function resolve() {
      calls.push({ table, eqFilters: [...eqFilters], inFilters: [...inFilters], order: [...order], limit, range });
      if (errors[table]) return { data: null, error: errors[table] };
      let rows = tableRows[table] ?? [];
      for (const [col, val] of eqFilters) rows = rows.filter((r) => r[col] === val);
      for (const [col, vals] of inFilters) rows = rows.filter((r) => vals.includes(r[col]));
      if (order.length > 0) {
        rows = [...rows].sort((a, b) => {
          for (const { col, ascending } of order) {
            const av = a[col] as string;
            const bv = b[col] as string;
            if (av === bv) continue;
            return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
          }
          return 0;
        });
      }
      if (limit !== undefined) rows = rows.slice(0, limit);
      if (range) rows = rows.slice(range[0], range[1] + 1);
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
      in(col: string, vals: unknown[]) {
        inFilters.push([col, vals]);
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        order.push({ col, ascending: opts?.ascending ?? true });
        return builder;
      },
      limit(n: number) {
        limit = n;
        return builder;
      },
      range(from: number, to: number) {
        range = [from, to];
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

describe("readProjectsList — budget de requêtes (absence structurelle de N+1)", () => {
  it("exactement 9 requêtes pour 2 projets", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow({ id: "p1" }), projectRow({ id: "p2" })],
    });
    await readProjectsList(client, NOW);
    expect(calls).toHaveLength(9);
  });

  it("exactement 9 requêtes pour 20 projets — jamais une requête par projet", async () => {
    const projects = Array.from({ length: 20 }, (_, i) => projectRow({ id: `p${i}` }));
    const { client, calls } = createMockClient({ projets_v3_projects: projects });
    await readProjectsList(client, NOW);
    expect(calls).toHaveLength(9);
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
      expect(calls.filter((c) => c.table === table)).toHaveLength(1);
    }
  });

  it("1 seule requête (liste projets) quand aucun projet n'est retourné", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [] });
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ generatedAt: NOW, projects: [] });
    expect(calls).toHaveLength(1);
  });
});

describe("readProjectsList — liste des projets", () => {
  it("aucun filtre de statut côté requête (closed inclus) ni limite — trié updated_at desc", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [
        projectRow({ id: "old", updated_at: "2026-01-01T00:00:00.000Z" }),
        projectRow({ id: "closed", status: "closed", updated_at: "2026-09-19T00:00:00.000Z" }),
        projectRow({ id: "recent", updated_at: "2026-09-19T12:00:00.000Z" }),
      ],
    });
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Les 3 projets sont présents, y compris "closed" (filtrage en mémoire
    // côté écran, pas côté requête) — le reader charge tout ce qui est
    // accessible.
    expect(result.value.projects.map((p) => p.id)).toEqual(["recent", "closed", "old"]);

    const projectCall = calls.find((c) => c.table === "projets_v3_projects")!;
    expect(projectCall.eqFilters).toEqual([]);
    expect(projectCall.order).toEqual([
      { col: "updated_at", ascending: false },
      { col: "id", ascending: true },
    ]);
    expect(projectCall.limit).toBeUndefined();
  });
});

describe("readProjectsList — pagination (cap PostgREST 1000 lignes/page)", () => {
  it("plus de 1000 projets -> aucune ligne perdue, pagination transparente via .range()", async () => {
    const projects = Array.from({ length: 1250 }, (_, i) =>
      projectRow({ id: `p${String(i).padStart(4, "0")}`, updated_at: NOW })
    );
    const { client, calls } = createMockClient({ projets_v3_projects: projects });
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projects).toHaveLength(1250);

    const projectCalls = calls.filter((c) => c.table === "projets_v3_projects");
    // 2 pages : [0,999] puis [1000,1249] (1250 lignes, page = 1000).
    expect(projectCalls).toHaveLength(2);
    expect(projectCalls[0]!.range).toEqual([0, 999]);
    expect(projectCalls[1]!.range).toEqual([1000, 1999]);
  });

  it("plus de 1000 lignes dans une collection enfant (work items) -> aucune perte, budget = 9 + pages supplémentaires", async () => {
    const workItems = Array.from({ length: 1500 }, (_, i) => workItemRow({ id: `wi${String(i).padStart(4, "0")}` }));
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow({ id: "p1" })],
      projets_v3_work_items: workItems,
    });
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Les 1500 work items appartiennent tous à p1 : le projet doit être
    // marqué needsAttention (statut par défaut "to_scope"), preuve indirecte
    // qu'aucune ligne n'a été perdue en route.
    expect(result.value.projects[0]!.needsAttention).toBe(true);

    const workItemCalls = calls.filter((c) => c.table === "projets_v3_work_items");
    expect(workItemCalls).toHaveLength(2);
    expect(workItemCalls[0]!.range).toEqual([0, 999]);
    expect(workItemCalls[1]!.range).toEqual([1000, 1999]);
    // Budget total : 1 (projets) + 8 (collections, 7 en 1 page + work_items
    // en 2 pages) = 10, jamais une requête par projet.
    expect(calls).toHaveLength(10);
  });
});

describe("readProjectsList — composition", () => {
  it("attentionLevel/needsAttention corrects via buildBrief (réutilisé, pas recalculé)", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow({ id: "p1" })],
      projets_v3_work_items: [workItemRow({ id: "wi1", status: "to_scope" })],
    });
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projects[0]!.needsAttention).toBe(true);
    expect(result.value.projects[0]!.attentionLevel).toBeDefined();
  });
});

describe("readProjectsList — propagation d'erreur", () => {
  it("erreur sur la liste des projets : propagée, aucune autre requête", async () => {
    const { client, calls } = createMockClient(
      { projets_v3_projects: [] },
      { projets_v3_projects: { code: "42501", message: "permission denied" } }
    );
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("erreur sur une collection batchée : propagée telle quelle", async () => {
    const { client } = createMockClient(
      { projets_v3_projects: [projectRow()] },
      { projets_v3_risks: { code: "42501", message: "permission denied" } }
    );
    const result = await readProjectsList(client, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "authorization", message: "permission denied" });
  });
});

describe("readProjectsList — aucun accès Objective/Stage/Workspace V2", () => {
  it("jamais de requête sur projets_v3_objectives, projets_v3_stages ou projets_workspaces", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [projectRow()] });
    await readProjectsList(client, NOW);
    expect(calls.some((c) => c.table === "projets_v3_objectives")).toBe(false);
    expect(calls.some((c) => c.table === "projets_v3_stages")).toBe(false);
    expect(calls.some((c) => c.table === "projets_workspaces")).toBe(false);
  });
});
