import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId, IsoDateTime, Project, Objective, WorkItem, Decision, Risk, Issue, Milestone } from "../../../../domain/v3/types";
import type { ProjectOverviewProjection } from "../../../../domain/v3/project-overview/types";
import { buildProjectOverview } from "../../../../domain/v3/project-overview/build-project-overview";
import { projectFromRow, type ProjectRow } from "../mappers/project";
import { objectiveFromRow, type ObjectiveRow } from "../mappers/objective";
import { workItemFromRow, type WorkItemRow } from "../mappers/work-item";
import { decisionFromRow, type DecisionRow } from "../mappers/decision";
import { riskFromRow, type RiskRow } from "../mappers/risk";
import { issueFromRow, type IssueRow } from "../mappers/issue";
import { milestoneFromRow, type MilestoneRow } from "../mappers/milestone";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const PROJECT_TABLE = "projets_v3_projects";
const OBJECTIVES_TABLE = "projets_v3_objectives";
const WORK_ITEMS_TABLE = "projets_v3_work_items";
const DECISIONS_TABLE = "projets_v3_decisions";
const RISKS_TABLE = "projets_v3_risks";
const ISSUES_TABLE = "projets_v3_issues";
const MILESTONES_TABLE = "projets_v3_milestones";
const EVIDENCE_TABLE = "projets_v3_evidence";

/** Même choix que brief-reader.ts : Project seul, sans objectiveIds (les
 * Objective sont chargées séparément par leur propre requête ci-dessous). */
async function fetchProject(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Project | null>> {
  const { data, error } = await client.from(PROJECT_TABLE).select().eq("id", projectId).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  if (!data) return okResult(null);
  return okResult(projectFromRow(data as ProjectRow, []));
}

async function listObjectives(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<Objective[]>> {
  const { data, error } = await client.from(OBJECTIVES_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => objectiveFromRow(row as ObjectiveRow)));
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

async function listMilestoneRows(client: SupabaseClient, projectId: EntityId): Promise<PersistenceResult<MilestoneRow[]>> {
  const { data, error } = await client.from(MILESTONES_TABLE).select().eq("project_id", projectId);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []) as MilestoneRow[]);
}

/** Même restriction que brief-reader.ts : Evidence limitée aux Milestones,
 * seule reconstruction de relation nécessaire à cet écran (gate §6/§9). */
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
 * Lecteur infrastructure de l'écran Projet V3 (Lot 4, gate validée). Charge
 * le strict nécessaire (Project + Objectives + 4 collections + Evidence des
 * Milestones uniquement — jamais Stage/Dependency/ChangeRequest), reconstruit
 * via les mappers V3 existants, puis délègue tout le calcul (dont
 * needsAttention/reason, exclusivement via buildBrief()) à
 * buildProjectOverview(). Aucune logique métier ici, aucun service_role.
 *
 * Séquence : 1 requête Project (validation), puis, si trouvé, 7 requêtes
 * indépendantes en parallèle (Promise.all) — 8 requêtes au total, aucune
 * boucle, aucun N+1.
 */
export async function readProjectOverview(
  client: SupabaseClient,
  projectId: EntityId,
  now: IsoDateTime
): Promise<PersistenceResult<ProjectOverviewProjection>> {
  const projectResult = await fetchProject(client, projectId);
  if (!projectResult.ok) return projectResult;
  if (!projectResult.value) {
    return failResult({ kind: "persistence", code: "not_found", message: `Project ${projectId} introuvable ou inaccessible.` });
  }
  const project = projectResult.value;

  const [objectives, workItems, decisions, risks, issues, milestoneRows, milestoneEvidenceIds] = await Promise.all([
    listObjectives(client, projectId),
    listWorkItems(client, projectId),
    listDecisions(client, projectId),
    listRisks(client, projectId),
    listIssues(client, projectId),
    listMilestoneRows(client, projectId),
    fetchMilestoneEvidenceIds(client, projectId),
  ]);

  if (!objectives.ok) return objectives;
  if (!workItems.ok) return workItems;
  if (!decisions.ok) return decisions;
  if (!risks.ok) return risks;
  if (!issues.ok) return issues;
  if (!milestoneRows.ok) return milestoneRows;
  if (!milestoneEvidenceIds.ok) return milestoneEvidenceIds;

  const milestones: Milestone[] = milestoneRows.value.map((row) =>
    milestoneFromRow(row, [], milestoneEvidenceIds.value.get(row.id) ?? [])
  );

  try {
    const overview = buildProjectOverview({
      project,
      now,
      objectives: objectives.value,
      workItems: workItems.value,
      decisions: decisions.value,
      risks: risks.value,
      issues: issues.value,
      milestones,
    });
    return okResult(overview);
  } catch (e) {
    return failResult({
      kind: "persistence",
      code: "unknown",
      message: `Impossible de construire l'aperçu du projet : ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
