import type { SupabaseClient } from "@supabase/supabase-js";
import type { Issue } from "../../../../domain/v3/types";
import { issueFromRow, issueToRow, type IssueRow } from "../mappers/issue";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { updateWithOptimisticConcurrency } from "../optimistic-concurrency";

const TABLE = "projets_v3_issues";

export async function createIssueRow(client: SupabaseClient, issue: Issue, workspaceId: string): Promise<PersistenceResult<Issue>> {
  const { data, error } = await client.from(TABLE).insert(issueToRow(issue, workspaceId)).select().single();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(issueFromRow(data as IssueRow));
}

export async function findIssueById(client: SupabaseClient, id: string): Promise<PersistenceResult<Issue | null>> {
  const { data, error } = await client.from(TABLE).select().eq("id", id).maybeSingle();
  if (error) return failResult(fromPostgrestError(error));
  return okResult(data ? issueFromRow(data as IssueRow) : null);
}

export async function updateIssueRow(
  client: SupabaseClient,
  issue: Issue,
  workspaceId: string,
  previousUpdatedAt: string
): Promise<PersistenceResult<Issue>> {
  const result = await updateWithOptimisticConcurrency<IssueRow>(client, TABLE, issue.id, previousUpdatedAt, issueToRow(issue, workspaceId));
  if (!result.ok) return result;
  return okResult(issueFromRow(result.value));
}
