import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readBrief } from "./brief-reader";

const NOW = "2026-09-20T08:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

type Row = Record<string, unknown>;

interface MockCall {
  table: string;
  filters: [string, unknown][];
}

/** Faux client Supabase : filtre réellement les lignes par .eq() (pour
 * vérifier que le reader applique bien les bons filtres, pas seulement
 * qu'il regroupe correctement en mémoire), et comptabilise chaque appel
 * .from() terminé (maybeSingle ou await direct) — jamais les intermédiaires
 * .select()/.eq() qui ne déclenchent aucune requête réseau réelle. */
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

function dependencyRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "dep1",
    project_id: "p1",
    workspace_id: "w1",
    source_entity_id: "wi1",
    dependent_entity_id: "wi2",
    type: "blocks",
    responsible_id: "user-a",
    needed_by_date: null,
    status: "pending",
    delay_impact: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function changeRequestRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "cr1",
    project_id: "p1",
    workspace_id: "w1",
    request: "Ajouter un module reporting",
    origin: "client",
    justification: null,
    impact: {},
    options: [],
    recommendation: null,
    decider_id: null,
    status: "submitted",
    linked_decision_id: null,
    created_at: NOW,
    updated_at: NOW,
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

describe("readBrief — projet valide", () => {
  it("aucune donnée liée : Brief vide", async () => {
    const { client } = createMockClient({ projets_v3_projects: [projectRow()] });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attentionItems).toEqual([]);
    expect(result.value.projectId).toBe("p1");
    expect(result.value.generatedAt).toBe(NOW);
  });

  it("données multi-domaines : chaque collection est transmise à buildBrief", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_work_items: [workItemRow({ status: "to_scope" })],
      projets_v3_decisions: [decisionRow()],
      projets_v3_risks: [riskRow({ criticality: "critical" })],
      projets_v3_issues: [issueRow({ status: "escalated" })],
      projets_v3_milestones: [milestoneRow({ status: "refused" })],
      projets_v3_dependencies: [dependencyRow({ status: "delayed" })],
      projets_v3_change_requests: [changeRequestRow()],
    });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new Set(result.value.attentionItems.map((i) => i.sourceType)).size).toBe(7);
  });
});

describe("reconstruction Milestone.evidenceIds", () => {
  it("JAL-002 violée : jalon ready_for_review sans preuve rattachée", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_milestones: [milestoneRow({ id: "m1", status: "ready_for_review" })],
      projets_v3_evidence: [],
    });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attentionItems).toEqual([expect.objectContaining({ sourceType: "milestone", ruleId: "JAL-002", severity: "blocking" })]);
  });

  it("JAL-002 satisfaite : preuve reconstruite depuis projets_v3_evidence fait disparaître la violation", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_milestones: [milestoneRow({ id: "m1", status: "ready_for_review" })],
      projets_v3_evidence: [evidenceRow({ id: "ev1", proved_entity_type: "milestone", proved_entity_id: "m1" })],
    });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Aucune règle violée sur ce jalon : absent d'attentionItems.
    expect(result.value.attentionItems).toEqual([]);
  });

  it("Evidence non-milestone ignorée (ne compte pas pour Milestone.evidenceIds)", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_milestones: [milestoneRow({ id: "m1", status: "ready_for_review" })],
      projets_v3_evidence: [evidenceRow({ id: "ev-wi", proved_entity_type: "work_item", proved_entity_id: "m1" })],
    });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // La preuve existe mais est de type work_item : JAL-002 reste violée.
    expect(result.value.attentionItems).toEqual([expect.objectContaining({ ruleId: "JAL-002" })]);
  });
});

describe("now transmis jusqu'à buildBrief", () => {
  it("un WorkItem en retard selon `now` déclenche ACT-005, satisfait à une date antérieure", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_work_items: [workItemRow({ status: "in_progress", responsible_id: "user-a", due_date: PAST })],
    });

    const late = await readBrief(client, "p1", NOW);
    expect(late.ok).toBe(true);
    if (late.ok) expect(late.value.attentionItems).toEqual([expect.objectContaining({ ruleId: "ACT-005" })]);

    const early = await readBrief(client, "p1", "2026-08-01T00:00:00.000Z");
    expect(early.ok).toBe(true);
    if (early.ok) expect(early.value.attentionItems).toEqual([]);
  });
});

describe("projet absent/inaccessible", () => {
  it("aucune ligne Project : erreur not_found, aucune autre requête déclenchée", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [] });
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.table).toBe("projets_v3_projects");
  });
});

describe("propagation d'erreur", () => {
  it("une erreur sur une collection est propagée telle quelle", async () => {
    const { client } = createMockClient(
      { projets_v3_projects: [projectRow()] },
      { projets_v3_risks: { code: "42501", message: "permission denied" } }
    );
    const result = await readBrief(client, "p1", NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "authorization", message: "permission denied" });
  });
});

describe("séparation entre projets", () => {
  it("readBrief ne retourne que les lignes du projet demandé", async () => {
    const { client } = createMockClient({
      projets_v3_projects: [projectRow({ id: "pA" }), projectRow({ id: "pB" })],
      projets_v3_work_items: [workItemRow({ id: "wiA", project_id: "pA", status: "to_scope" }), workItemRow({ id: "wiB", project_id: "pB", status: "to_scope" })],
    });
    const briefA = await readBrief(client, "pA", NOW);
    expect(briefA.ok).toBe(true);
    if (!briefA.ok) return;
    expect(briefA.value.attentionItems.map((i) => i.sourceId)).toEqual(["wiA"]);
    expect(briefA.value.attentionItems.every((i) => i.projectId === "pA")).toBe(true);
  });
});

describe("aucun accès Objective/Stage", () => {
  it("jamais de requête sur projets_v3_objectives ou projets_v3_stages", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_milestones: [milestoneRow()],
    });
    await readBrief(client, "p1", NOW);
    expect(calls.some((c) => c.table === "projets_v3_objectives")).toBe(false);
    expect(calls.some((c) => c.table === "projets_v3_stages")).toBe(false);
  });
});

describe("nombre de requêtes borné — absence structurelle de N+1", () => {
  it("exactement 9 requêtes (1 projet + 8 parallèles), quel que soit le nombre de lignes", async () => {
    const { client, calls } = createMockClient({
      projets_v3_projects: [projectRow()],
      projets_v3_work_items: [workItemRow({ id: "wi1" }), workItemRow({ id: "wi2" }), workItemRow({ id: "wi3" })],
      projets_v3_milestones: [milestoneRow({ id: "m1" }), milestoneRow({ id: "m2" }), milestoneRow({ id: "m3" })],
      projets_v3_evidence: [
        evidenceRow({ id: "ev1", proved_entity_id: "m1" }),
        evidenceRow({ id: "ev2", proved_entity_id: "m2" }),
        evidenceRow({ id: "ev3", proved_entity_id: "m3" }),
      ],
    });
    await readBrief(client, "p1", NOW);
    expect(calls).toHaveLength(9);
    // Une seule requête Evidence pour 3 jalons : pas de N+1.
    expect(calls.filter((c) => c.table === "projets_v3_evidence")).toHaveLength(1);
    expect(calls.filter((c) => c.table === "projets_v3_milestones")).toHaveLength(1);
  });

  it("1 seule requête (Project) quand le projet est absent", async () => {
    const { client, calls } = createMockClient({ projets_v3_projects: [] });
    await readBrief(client, "p1", NOW);
    expect(calls).toHaveLength(1);
  });
});
