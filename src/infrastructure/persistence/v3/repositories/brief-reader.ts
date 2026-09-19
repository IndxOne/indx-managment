import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId, IsoDateTime, Project, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest } from "../../../../domain/v3/types";
import type { BriefProjection } from "../../../../domain/v3/brief/types";
import { buildBrief } from "../../../../domain/v3/brief/build-brief";
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

/**
 * Charge le Project seul (sans objectiveIds — jamais lu par buildBrief, cf.
 * gate) : évite la requête objectives inutile que ferait findProjectById()
 * du Lot 1.
 */
async function fetchProject(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Project | null>> {
  const { data, error } = await client.from(PROJECT_TABLE).select().eq("id", projectId).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  return okResult(projectFromRow(data as ProjectRow, []));
}

async function listWorkItems(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<WorkItem[]>> {
  const { data, error } = await client.from(WORK_ITEMS_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => workItemFromRow(row as WorkItemRow, [], [])));
}

async function listDecisions(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Decision[]>> {
  const { data, error } = await client.from(DECISIONS_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => decisionFromRow(row as DecisionRow, [], [])));
}

async function listRisks(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Risk[]>> {
  const { data, error } = await client.from(RISKS_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => riskFromRow(row as RiskRow)));
}

async function listIssues(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Issue[]>> {
  const { data, error } = await client.from(ISSUES_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => issueFromRow(row as IssueRow)));
}

/** Lignes brutes, non mappées : la reconstruction de evidenceIds (jointure
 * en mémoire avec fetchMilestoneEvidenceIds) se fait après, dans readBrief. */
async function listMilestoneRows(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<MilestoneRow[]>> {
  const { data, error } = await client.from(MILESTONES_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []) as MilestoneRow[]);
}

async function listDependencies(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Dependency[]>> {
  const { data, error } = await client.from(DEPENDENCIES_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => dependencyFromRow(row as DependencyRow)));
}

async function listChangeRequests(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<ChangeRequest[]>> {
  const { data, error } = await client.from(CHANGE_REQUESTS_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => changeRequestFromRow(row as ChangeRequestRow)));
}

/**
 * Seule requête Evidence de ce reader — strictement limitée aux preuves
 * rattachées à un Milestone (proved_entity_type = "milestone"), seule
 * relation dont une règle Lot 2 consommée par buildBrief a réellement
 * besoin (JAL-002/hasEvidence). Aucune Evidence WorkItem/Decision/
 * ChangeRequest n'est chargée ici.
 */
async function fetchMilestoneEvidenceIds(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Map<EntityId, EntityId[]>>> {
  const { data, error } = await client
    .from(EVIDENCE_TABLE)
    .select("id, proved_entity_id")
    .eq("project_id", projectId)
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

/**
 * Lecteur infrastructure de Mon Brief (Lot 3 → gate lecteur). Charge le
 * strict nécessaire (Project + 7 collections + Evidence des Milestones
 * uniquement — jamais Objective/Stage), reconstruit les entités via les
 * mappers V3 existants, puis délègue tout le calcul à buildBrief(). Aucune
 * logique métier ici, aucun accès service_role : le contrôle d'accès
 * repose exclusivement sur les policies RLS V3 déjà en place.
 *
 * Séquence : 1 requête Project (validation), puis, seulement si trouvé,
 * 8 requêtes indépendantes en parallèle (Promise.all) — 9 requêtes au
 * total, aucune boucle, aucun N+1.
 */
export async function readBrief(client: SupabaseClient, projectId: EntityId, now: IsoDateTime): Promise<PersistenceResult<BriefProjection>> {
  const projectResult = await fetchProject(client, projectId);
  if (!projectResult.ok) return projectResult;
  if (!projectResult.value) {
    return failResult({ kind: "persistence", code: "not_found", message: `Project ${projectId} introuvable ou inaccessible.` });
  }
  const project = projectResult.value;

  const [workItems, decisions, risks, issues, milestoneRows, milestoneEvidenceIds, dependencies, changeRequests] = await Promise.all([
    listWorkItems(client, projectId),
    listDecisions(client, projectId),
    listRisks(client, projectId),
    listIssues(client, projectId),
    listMilestoneRows(client, projectId),
    fetchMilestoneEvidenceIds(client, projectId),
    listDependencies(client, projectId),
    listChangeRequests(client, projectId),
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

  try {
    const brief = buildBrief({
      project,
      now,
      workItems: workItems.value,
      decisions: decisions.value,
      risks: risks.value,
      issues: issues.value,
      milestones,
      dependencies: dependencies.value,
      changeRequests: changeRequests.value,
    });
    return okResult(brief);
  } catch (e) {
    return failResult({
      kind: "persistence",
      code: "unknown",
      message: `Impossible de construire le Brief : ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
