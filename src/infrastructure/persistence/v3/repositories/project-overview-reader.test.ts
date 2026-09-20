import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readProjectOverview } from "./project-overview-reader";

const NOW = "2026-09-20T08:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

type Row = Record<string, unknown>;

interface MockCall {
  table: string;
  filters: [string, unknown][];
}

/** Même faux client Supabase que brief-reader.test.ts : filtre réellement
 * par .eq(), comptabilise chaque appel .from() terminé. */
function createMockClient(tableRows: Record<string, Row[]>, errors: Partial<Record<string, { code?: string; message: string }>> = {}) {
  const calls: MockCall[] = [];

  function from(table: string) {
    const filters: [string, unknown][] = [];
    async function resolve() {
      calls.push({ table, filters: [...filters] });
      if (errors[table]) return { data: null, error: errors[table] };
      let rows = tableRows[table] ?? [];
      for (const [col, val] of filters) {
        rows = rows.filter((r) => r[col] === val);
      }
      return { data: rows, error: null };
    }
    const builder = {
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      async maybeSingle() {
        const result = await resolve();
        return { data: (result.data as Row[] | null)?.[0] ?? null, error: result.error };
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

function objectiveRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "o1",
    project_id: "p1",
    workspace_id: "w1",
    statement: "Migrer 100% des boîtes mail",
    expected_value: null,
    owner_id: null,
    status: "active",
    created_at: NOW,
    updated_at: NOW,
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

function decisionRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "d1",
    project_id: "p1",
    workspace_id: "w1",
    question: "Quel fournisseur ERP retenir ?",
    context: "3 devis reçus",
    options: [],
    recommendation: null,
    criteria: null,
    decider_id: null,
    due_date: null,
    status: "to_prepare",
    outcome: null,
    review_conditions: null,
    created_at: NOW,
    updated_at: NOW,
    decided_at: null,
    applied_at: null,
    verified_at: null,
    ...overrides,
  };
}

function riskRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "r1",
    project_id: "p1",
    workspace_id: "w1",
    event: "Départ du sponsor",
    cause: null,
    consequence: null,
    probability: null,
    impact: null,
    criticality: null,
    strategy: null,
    response: null,
    owner_id: null,
    trigger: null,
    review_date: null,
    residual_risk: null,
    status: "identified",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function issueRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "i1",
    project_id: "p1",
    workspace_id: "w1",
    origin_risk_id: null,
    problem: "Accès VPN indisponible",
    actual_impact: null,
    blocked_entity_id: null,
    resolver_id: null,
    corrective_action: null,
    target_date: null,
    escalated: false,
    status: "open",
    created_at: NOW,
    updated_at: NOW,
    resolved_at: null,
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
    target_date: FUTURE,
    forecast_date: null,
    acceptance_criteria: [{ description: "x", satisfied: true }],
    approver_id: null,
    status: "ready_for_review",
    created_at: NOW,
    updated_at: NOW,
    reviewed_at: null,
    ...overrides,
  };
}

function evidenceRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "ev1",
    project_id: "p1",
    workspace_id: "w1",
    proved_entity_type: "milestone",
    proved_entity_id: "m1",
    type: "document",
    description: "PV de recette",
    source: null,
    author_id: null,
    validation_status: "pending",
    created_at: NOW,
    ...overrides,
  };
}

describe("readProjectOverview — projet valide", () => {
  it("aucune donnée liée : projection vide, project transmis", async () => {
    const { client } = createMockClient({ projets_v3_projects: [projectRow()] });
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.project.id).toBe("p1");
    expect(result.value.project.name).toBe("Migration M365");
    expect(result.value.objectives).toEqual([]);
    expect(result.value.milestones).toEqual([]);
    expect(result.value.workItems).toEqual([]);
    expect(result.value.decisions).toEqual([]);
    expect(result.value.risks).toEqual([]);
    expect(result.value.issues).toEqual([]);
  });

  it("8 requêtes maximum : Project puis 7 en parallèle, zéro N+1", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_objectives: [objectiveRow()],
      projets_v3_work_items: [workItemRow()],
      projets_v3_decisions: [decisionRow()],
      projets_v3_risks: [riskRow()],
      projets_v3_issues: [issueRow()],
      projets_v3_milestones: [milestoneRow()],
      projets_v3_evidence: [evidenceRow()],
    });
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(8);
    expect(calls[0]!.table).toBe("projets_v3_projects");
    const tables = new Set(calls.map((c) => c.table));
    expect(tables).toEqual(
      new Set([
        "projets_v3_projects",
        "projets_v3_objectives",
        "projets_v3_work_items",
        "projets_v3_decisions",
        "projets_v3_risks",
        "projets_v3_issues",
        "projets_v3_milestones",
        "projets_v3_evidence",
      ])
    );
  });

  it("n'interroge jamais Stage, Dependency ou ChangeRequest (différés, gate §9)", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [projectRow()] });
    await readProjectOverview(client, "p1", NOW);
    const tables = calls.map((c) => c.table);
    expect(tables).not.toContain("projets_v3_stages");
    expect(tables).not.toContain("projets_v3_dependencies");
    expect(tables).not.toContain("projets_v3_change_requests");
  });

  it("Evidence limitée à proved_entity_type=milestone (reconstruction evidenceIds uniquement)", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_milestones: [milestoneRow({ id: "m1", status: "ready_for_review" })],
      projets_v3_evidence: [evidenceRow({ id: "ev1", proved_entity_type: "milestone", proved_entity_id: "m1" })],
    });
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Preuve rattachée : JAL-002 satisfaite, jalon absent de needsAttention.
    expect(result.value.milestones[0]!.needsAttention).toBe(false);
  });

  it("needsAttention/reason d'un WorkItem proviennent de buildBrief() (ACT-001)", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_work_items: [workItemRow({ id: "wi1", status: "ready" })],
    });
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.workItems[0]!.needsAttention).toBe(true);
    expect(result.value.workItems[0]!.reason).toBeTruthy();
  });
});

describe("readProjectOverview — projet absent/inaccessible", () => {
  it("aucune ligne Project : erreur not_found, aucune autre requête déclenchée", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [] });
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.table).toBe("projets_v3_projects");
  });
});

describe("readProjectOverview — propagation d'erreur / RLS", () => {
  it("une erreur sur une collection est propagée telle quelle, aucun service_role", async () => {
    const { client } = createMockClient(
      { projets_v3_projects: [projectRow()] },
      { projets_v3_risks: { code: "42501", message: "permission denied" } }
    );
    const result = await readProjectOverview(client, "p1", NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("authorization");
  });
});
