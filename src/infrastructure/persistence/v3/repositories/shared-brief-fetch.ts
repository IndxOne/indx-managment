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
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const WORK_ITEMS_TABLE = "projets_v3_work_items";
const DECISIONS_TABLE = "projets_v3_decisions";
const RISKS_TABLE = "projets_v3_risks";
const ISSUES_TABLE = "projets_v3_issues";
const MILESTONES_TABLE = "projets_v3_milestones";
const DEPENDENCIES_TABLE = "projets_v3_dependencies";
const CHANGE_REQUESTS_TABLE = "projets_v3_change_requests";
const EVIDENCE_TABLE = "projets_v3_evidence";

async function listWorkItems(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<WorkItem[]>> {
  const { data, error } = await client.from(WORK_ITEMS_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => workItemFromRow(row as WorkItemRow, [], [])));
}

async function listDecisions(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Decision[]>> {
  const { data, error } = await client.from(DECISIONS_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => decisionFromRow(row as DecisionRow, [], [])));
}

async function listRisks(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Risk[]>> {
  const { data, error } = await client.from(RISKS_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => riskFromRow(row as RiskRow)));
}

async function listIssues(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Issue[]>> {
  const { data, error } = await client.from(ISSUES_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => issueFromRow(row as IssueRow)));
}

async function listMilestoneRows(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<MilestoneRow[]>> {
  const { data, error } = await client.from(MILESTONES_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []) as MilestoneRow[]);
}

async function listDependencies(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Dependency[]>> {
  const { data, error } = await client.from(DEPENDENCIES_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => dependencyFromRow(row as DependencyRow)));
}

async function listChangeRequests(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<ChangeRequest[]>> {
  const { data, error } = await client.from(CHANGE_REQUESTS_TABLE).select().in("project_id", projectIds);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => changeRequestFromRow(row as ChangeRequestRow)));
}

/** Même périmètre que brief-reader.ts : uniquement les preuves rattachées à
 * un Milestone (proved_entity_type = "milestone"), seule relation Evidence
 * dont buildBrief a besoin (JAL-002). */
async function fetchMilestoneEvidenceIds(client: SupabaseClient, projectIds: EntityId[]): Promise<PersistenceResult<Map<EntityId, EntityId[]>>> {
  const { data, error } = await client
    .from(EVIDENCE_TABLE)
    .select("id, proved_entity_id")
    .in("project_id", projectIds)
    .eq("proved_entity_type", "milestone");
  if (error) return failResult(fromPostgrestError(error));

  const evidenceIdsByMilestoneId = new Map<EntityId, EntityId[]>();
  for (const row of (data ?? []) as { id: string; proved_entity_id: string }[]) {
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
 * home-overview-reader.ts sans changement de comportement (même 8 requêtes
 * batchées `.in("project_id", ids)`, même appel `buildBrief()` par projet en
 * mémoire, aucune règle réévaluée). Le nombre de projets n'affecte jamais le
 * nombre de requêtes : seule leur taille varie selon `projectIds`.
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
