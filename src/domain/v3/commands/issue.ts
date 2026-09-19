import type { Issue, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionIssue } from "../state-machines";

export function escalateIssue(issue: Issue, now: IsoDateTime): CommandResult<Issue> {
  if (!canTransitionIssue(issue.status, "escalated")) {
    return fail(domainError("issue_invalid_transition", `Transition ${issue.status} -> escalated interdite`, issue.id));
  }
  return ok({ ...issue, escalated: true, status: "escalated", updatedAt: now }, []);
}

export function resolveIssue(issue: Issue, resolverId: EntityId, correctiveAction: string, now: IsoDateTime): CommandResult<Issue> {
  if (!canTransitionIssue(issue.status, "resolved")) {
    return fail(domainError("issue_invalid_transition", `Transition ${issue.status} -> resolved interdite`, issue.id));
  }
  if (!resolverId) {
    return fail(domainError("issue_missing_resolver", "Un responsable de résolution est requis", issue.id));
  }
  const next: Issue = { ...issue, resolverId, correctiveAction, status: "resolved", resolvedAt: now, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "issue.resolved", occurredAt: now, projectId: issue.projectId, payload: { issueId: issue.id } },
  ];
  return ok(next, events);
}
