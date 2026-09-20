import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId, IsoDateTime, Project, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest } from "../../../../domain/v3/types";
import type { BriefProjection } from "../../../../domain/v3/brief/types";
import type { HomeOverviewProjection } from "../../../../domain/v3/home/types";
import { buildBrief } from "../../../../domain/v3/brief/build-brief";
import { buildHomeOverview } from "../../../../domain/v3/home/build-home-overview";
import { projectFromRow, type ProjectRow } from "../mappers/project";
import { workItemFromRow, type WorkItemRow } from "../mappers/work-item";
import { decisionFromRow, type DecisionRow } from "../mappers/decision";
import { riskFromRow, type RiskRow } from "../mappers/risk";
import { issueFromRow, type IssueRow } from "../mappers/issue";
import { milestoneFromRow, type MilestoneRow } from "../mappers/milestone";
import { dependencyFromRow, type DependencyRow } from "../mappers/dependency";
import { changeRequestFromRow, type ChangeRequestRow } from "../mappers/change-request";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const PROJECT_TABLE = "projets_v3_projects";
const WORK_ITEMS_TABLE = "projets_v3_work_items";
const DECISIONS_TABLE = "projets_v3_decisions";
const RISKS_TABLE = "projets_v3_risks";
const ISSUES_TABLE = "projets_v3_issues";
const MILESTONES_TABLE = "projets_v3_milestones";
const DEPENDENCIES_TABLE = "projets_v3_dependencies";
const CHANGE_REQUESTS_TABLE = "projets_v3_change_requests";
const EVIDENCE_TABLE = "projets_v3_evidence";

/** ≤5 projets (gate §4) : borne le nombre de lignes de la 1ʳᵉ requête, ce
 * qui borne à son tour la taille des 8 requêtes batchées `.in()` suivantes —
 * c'est ce qui garantit le budget fixe de requêtes, pas un filtre après coup. */
const MAX_PROJECTS = 5;

/**
 * Liste courte des projets affichés en Home — non clôturés, les plus
 * récemment mis à jour d'abord. Réutilise projectFromRow (aucun second
 * mapper) : les colonnes chargées sont les mêmes que fetchProject() dans
 * brief-reader.ts, seul le filtre/tri/limite diffère.
 */
async function listHomeProjects(client: SupabaseClient): Promise<PersistenceResult<Project[]>> {
  const { data, error } = await client
    .from(PROJECT_TABLE)
    .select()
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(MAX_PROJECTS);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => projectFromRow(row as ProjectRow, [])));
}

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

/**
 * Lecteur infrastructure de Home V3 (Lot UX-2, gate validée). Budget fixe :
 * 1 requête (liste des projets, bornée à 5) + 8 requêtes batchées en
 * parallèle (`Promise.all`, filtrées `.in("project_id", ids)` au lieu d'un
 * `.eq()` par projet) = 9 requêtes au total, quel que soit le nombre de
 * projets réels du compte — jamais readProjectOverview()/readBrief() appelé
 * en boucle. buildBrief() est ensuite appelé une fois par projet chargé,
 * en mémoire, sans requête supplémentaire — aucune règle métier réécrite,
 * seulement la même fonction que Mon Brief, réutilisée telle quelle.
 */
export async function readHomeOverview(client: SupabaseClient, now: IsoDateTime): Promise<PersistenceResult<HomeOverviewProjection>> {
  const projectsResult = await listHomeProjects(client);
  if (!projectsResult.ok) return projectsResult;
  const projects = projectsResult.value;

  if (projects.length === 0) {
    return okResult({ generatedAt: now, attentionItems: [], projects: [] });
  }

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

  const overview = buildHomeOverview({ now, projects, briefsByProjectId, milestonesByProjectId });
  return okResult(overview);
}
