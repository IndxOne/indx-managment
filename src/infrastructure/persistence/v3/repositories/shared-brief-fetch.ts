import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId, IsoDateTime, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest, Project } from "../../../../domain/v3/types";
import type { BriefProjection } from "../../../../domain/v3/brief/types";
import { buildBrief } from "../../../../domain/v3/brief/build-brief";
import { workItemFromRow, type WorkItemRow } from "../mappers/work-item";
import { decisionFromRow, type DecisionRow } from "../mappers/decision";
import { riskFromRow, type RiskRow } from "../mappers/risk";
import { issueFromRow, type IssueRow } from "../mappers/issue";
import { milestoneFromRow, type MilestoneRow } from "../mappers/milestone";
import { dependencyFromRow, type DependencyRow } from "../mappers/dependency";
import { changeRequestFromRow, type ChangeRequestRow } from "../mappers/change-request";
import { failResult, okResult, type PersistenceResult } from "../errors";
import { fetchAllRows } from "./pagination";

const WORK_ITEMS_TABLE = "projets_v3_work_items";
const DECISIONS_TABLE = "projets_v3_decisions";
const RISKS_TABLE = "projets_v3_risks";
const ISSUES_TABLE = "projets_v3_issues";
const MILESTONES_TABLE = "projets_v3_milestones";
const DEPENDENCIES_TABLE = "projets_v3_dependencies";
const CHANGE_REQUESTS_TABLE = "projets_v3_change_requests";
const EVIDENCE_TABLE = "projets_v3_evidence";

/**
 * Chaque collection est paginée indépendamment (`fetchAllRows`, cf.
 * pagination.ts) : le cap PostgREST à 1000 lignes par réponse s'applique par
 * requête, pas par projet — toujours une pagination par collection, jamais
 * une requête par projet (ça resterait du N+1 déguisé). `.order("id")` sert
 * uniquement de tie-break déterministe pour que `.range()` soit stable d'une
 * page à l'autre ; l'ordre des lignes n'a aucune signification métier ici
 * (buildBrief() les regroupe par project_id, jamais consommées dans l'ordre).
 */
async function listWorkItems(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<WorkItem[]>> {
  const result = await fetchAllRows<WorkItemRow>((from, to) =>
    client.from(WORK_ITEMS_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => workItemFromRow(row, [], [])));
}

async function listDecisions(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Decision[]>> {
  const result = await fetchAllRows<DecisionRow>((from, to) =>
    client.from(DECISIONS_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => decisionFromRow(row, [], [])));
}

async function listRisks(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Risk[]>> {
  const result = await fetchAllRows<RiskRow>((from, to) =>
    client.from(RISKS_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => riskFromRow(row)));
}

async function listIssues(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Issue[]>> {
  const result = await fetchAllRows<IssueRow>((from, to) =>
    client.from(ISSUES_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => issueFromRow(row)));
}

async function listMilestoneRows(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<MilestoneRow[]>> {
  return fetchAllRows<MilestoneRow>((from, to) =>
    client.from(MILESTONES_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
}

async function listDependencies(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Dependency[]>> {
  const result = await fetchAllRows<DependencyRow>((from, to) =>
    client.from(DEPENDENCIES_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => dependencyFromRow(row)));
}

async function listChangeRequests(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<ChangeRequest[]>> {
  const result = await fetchAllRows<ChangeRequestRow>((from, to) =>
    client.from(CHANGE_REQUESTS_TABLE).select().in("project_id", projectIds).order("id", { ascending: true }).range(from, to)
  );
  if (!result.ok) return result;
  return okResult(result.value.map((row) => changeRequestFromRow(row)));
}

/** Même périmètre que brief-reader.ts : uniquement les preuves rattachées à
 * un Milestone (proved_entity_type = "milestone"), seule relation Evidence
 * dont buildBrief a besoin (JAL-002). */
async function fetchMilestoneEvidenceIds(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Map<EntityId, EntityId[]>>> {
  const result = await fetchAllRows<{ id: string; proved_entity_id: string }>((from, to) =>
    client
      .from(EVIDENCE_TABLE)
      .select("id, proved_entity_id")
      .in("project_id", projectIds)
      .eq("proved_entity_type", "milestone")
      .order("id", { ascending: true })
      .range(from, to)
  );
  if (!result.ok) return result;

  const evidenceIdsByMilestoneId = new Map<EntityId, EntityId[]>();
  for (const row of result.value) {
    const existing = evidenceIdsByMilestoneId.get(row.proved_entity_id) ?? [];
    existing.push(row.id);
    evidenceIdsByMilestoneId.set(row.proved_entity_id, existing);
  }
  return okResult(evidenceIdsByMilestoneId);
}

function groupByProjectId<T extends { projectId: EntityId }>(items: T[]): Map<EntityId, T[]> {
  const map = new Map<EntityId, T[]>();
  for (const item of items) {
    const existing = map.get(item.projectId) ?? [];
    existing.push(item);
    map.set(item.projectId, existing);
  }
  return map;
}

export interface BriefsAndMilestones {
  briefsByProjectId: Map<EntityId, BriefProjection>;
  milestonesByProjectId: Map<EntityId, Milestone[]>;
}

/**
 * Cœur partagé Home V3 (UX-2) / Projets V3 (UX-3) — extrait de
 * home-overview-reader.ts. 8 collections batchées `.in("project_id", ids)`,
 * chacune paginée indépendamment (`fetchAllRows`, cap PostgREST 1000
 * lignes/page) : budget = 8 + somme(pages nécessaires par collection au-delà
 * de la 1ʳᵉ), jamais une requête par projet. En dessous de 1000 lignes par
 * collection (cas réel actuel), c'est toujours exactement 8 requêtes.
 * `buildBrief()` est appelé une fois par projet en mémoire, aucune règle
 * réévaluée.
 */
export async function fetchBriefsAndMilestones(
  client: SupabaseClient,
  projects: Project[],
  now: IsoDateTime
): Promise<PersistenceResult<BriefsAndMilestones>> {
  const projectIds = projects.map((project) => project.id);

  const [workItems, decisions, risks, issues, milestoneRows, milestoneEvidenceIds, dependencies, changeRequests] = await Promise.all([
    listWorkItems(client, projectIds),
    listDecisions(client, projectIds),
    listRisks(client, projectIds),
    listIssues(client, projectIds),
    listMilestoneRows(client, projectIds),
    fetchMilestoneEvidenceIds(client, projectIds),
    listDependencies(client, projectIds),
    listChangeRequests(client, projectIds),
  ]);

  if (!workItems.ok) return workItems;
  if (!decisions.ok) return decisions;
  if (!risks.ok) return risks;
  if (!issues.ok) return issues;
  if (!milestoneRows.ok) return milestoneRows;
  if (!milestoneEvidenceIds.ok) return milestoneEvidenceIds;
  if (!dependencies.ok) return dependencies;
  if (!changeRequests.ok) return changeRequests;

  const milestones: Milestone[] = milestoneRows.value.map((row) =>
    milestoneFromRow(row, [], milestoneEvidenceIds.value.get(row.id) ?? [])
  );

  const workItemsByProject = groupByProjectId(workItems.value);
  const decisionsByProject = groupByProjectId(decisions.value);
  const risksByProject = groupByProjectId(risks.value);
  const issuesByProject = groupByProjectId(issues.value);
  const milestonesByProjectId = groupByProjectId(milestones);
  const dependenciesByProject = groupByProjectId(dependencies.value);
  const changeRequestsByProject = groupByProjectId(changeRequests.value);

  const briefsByProjectId = new Map<EntityId, BriefProjection>();
  for (const project of projects) {
    try {
      const brief = buildBrief({
        project,
        now,
        workItems: workItemsByProject.get(project.id) ?? [],
        decisions: decisionsByProject.get(project.id) ?? [],
        risks: risksByProject.get(project.id) ?? [],
        issues: issuesByProject.get(project.id) ?? [],
        milestones: milestonesByProjectId.get(project.id) ?? [],
        dependencies: dependenciesByProject.get(project.id) ?? [],
        changeRequests: changeRequestsByProject.get(project.id) ?? [],
      });
      briefsByProjectId.set(project.id, brief);
    } catch (e) {
      return failResult({
        kind: "persistence",
        code: "unknown",
        message: `Impossible de construire le Brief du projet ${project.id} : ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return okResult({ briefsByProjectId, milestonesByProjectId });
}
