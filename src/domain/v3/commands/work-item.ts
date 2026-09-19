import type { WorkItem, WorkItemStatus, WorkItemType, WorkItemPriority, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionWorkItem } from "../state-machines";

export interface CreateWorkItemInput {
  id: EntityId;
  projectId: EntityId;
  type: WorkItemType;
  title: string;
  priority: WorkItemPriority;
  now: IsoDateTime;
  responsibleId?: EntityId;
  dueDate?: IsoDateTime;
  exitCondition?: string;
}

export function createWorkItem(input: CreateWorkItemInput): CommandResult<WorkItem> {
  const item: WorkItem = {
    id: input.id,
    projectId: input.projectId,
    type: input.type,
    title: input.title,
    responsibleId: input.responsibleId,
    status: "to_scope",
    priority: input.priority,
    dueDate: input.dueDate,
    exitCondition: input.exitCondition,
    acceptanceCriteria: [],
    dependencyIds: [],
    evidenceIds: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(item, []);
}

export function assignWorkItem(item: WorkItem, responsibleId: EntityId, now: IsoDateTime): CommandResult<WorkItem> {
  const next: WorkItem = { ...item, responsibleId, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "work_item.assigned", occurredAt: now, projectId: item.projectId, payload: { workItemId: item.id, responsibleId } },
  ];
  return ok(next, events);
}

/** ACT-001 (§11.5) — prédicat pur partagé avec le moteur de règles (Lot 2,
 * cf. rules/work-item-rules.ts) : source unique de vérité. */
export function hasResponsible(item: WorkItem): boolean {
  return Boolean(item.responsibleId);
}

/** ACT-002 (§11.5) — idem, partagé avec le moteur de règles. */
export function hasExitConditionOrDueDate(item: WorkItem): boolean {
  return Boolean(item.dueDate || item.exitCondition);
}

/**
 * ACT-001/ACT-002 (§11.5) au niveau structurel : passer à "ready" exige un
 * responsable ET (une échéance OU une condition de sortie) — l'invariant
 * vit ici, dans le domaine ; la relance/notification qui en découle
 * appartient au moteur de règles (Lot 2), pas à cette fonction.
 */
export function transitionWorkItem(item: WorkItem, to: WorkItemStatus, now: IsoDateTime): CommandResult<WorkItem> {
  if (!canTransitionWorkItem(item.status, to)) {
    return fail(domainError("work_item_invalid_transition", `Transition ${item.status} -> ${to} interdite`, item.id));
  }
  if (to === "ready" && !hasResponsible(item)) {
    return fail(domainError("work_item_missing_responsible", "Un responsable est requis avant de passer à Prêt", item.id));
  }
  if (to === "ready" && !hasExitConditionOrDueDate(item)) {
    return fail(domainError("work_item_missing_exit_condition", "Une échéance ou une condition de sortie est requise avant de passer à Prêt", item.id));
  }
  if (to === "blocked" && !item.blockedReason) {
    return fail(domainError("work_item_blocked_without_reason", "Un motif de blocage est requis", item.id));
  }
  const next: WorkItem = { ...item, status: to, updatedAt: now };
  const events: DomainEvent[] = [
    { type: "work_item.transitioned", occurredAt: now, projectId: item.projectId, payload: { workItemId: item.id, from: item.status, to } },
  ];
  if (to === "blocked") {
    events.push({ type: "work_item.blocked", occurredAt: now, projectId: item.projectId, payload: { workItemId: item.id, reason: item.blockedReason ?? "" } });
  }
  return ok(next, events);
}

/** Pose le motif AVANT la transition vers "blocked" (transitionWorkItem
 * l'exige) — séparé pour ne jamais muter blockedReason silencieusement à
 * un autre moment du cycle de vie. */
export function setBlockedReason(item: WorkItem, reason: string, nextStep: string | undefined, now: IsoDateTime): CommandResult<WorkItem> {
  return ok({ ...item, blockedReason: reason, blockedNextStep: nextStep, updatedAt: now }, []);
}
