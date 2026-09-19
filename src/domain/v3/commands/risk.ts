import type { Risk, RiskProbability, RiskImpact, Criticality, RiskResponseStrategy, Issue, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";
import { canTransitionRisk } from "../state-machines";

export interface CreateRiskInput {
  id: EntityId;
  projectId: EntityId;
  event: string;
  now: IsoDateTime;
  cause?: string;
  consequence?: string;
}

export function createRisk(input: CreateRiskInput): CommandResult<Risk> {
  const risk: Risk = {
    id: input.id,
    projectId: input.projectId,
    event: input.event,
    cause: input.cause,
    consequence: input.consequence,
    status: "identified",
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok(risk, []);
}

const CRITICALITY_MATRIX: Record<RiskProbability, Record<RiskImpact, Criticality>> = {
  low: { low: "low", medium: "low", high: "medium" },
  medium: { low: "low", medium: "medium", high: "high" },
  high: { low: "medium", medium: "high", high: "critical" },
};

/** Criticité TOUJOURS dérivée de probabilité × impact — jamais posée à la
 * main (cahier §19.1 : "la criticité est déterminée par une matrice
 * explicite"). */
export function qualifyRisk(risk: Risk, probability: RiskProbability, impact: RiskImpact, now: IsoDateTime): CommandResult<Risk> {
  if (!canTransitionRisk(risk.status, "qualified")) {
    return fail(domainError("risk_invalid_transition", `Transition ${risk.status} -> qualified interdite`, risk.id));
  }
  const criticality = CRITICALITY_MATRIX[probability][impact];
  const next: Risk = { ...risk, probability, impact, criticality, status: "qualified", updatedAt: now };
  const events: DomainEvent[] = [
    { type: "risk.qualified", occurredAt: now, projectId: risk.projectId, payload: { riskId: risk.id, criticality } },
  ];
  return ok(next, events);
}

function isCriticalOrHigh(criticality: Criticality | undefined): boolean {
  return criticality === "high" || criticality === "critical";
}

/** RSK-002 (§11.5) — prédicat pur partagé avec le moteur de règles (Lot 2).
 * Ne s'applique qu'aux risques high/critical (vacuously satisfait sinon).
 * planRiskResponse() l'applique au paramètre `ownerId` proposé ; la règle
 * RSK-002 l'applique à `risk.ownerId` déjà posé — même prédicat, entrée
 * différente selon le moment de l'évaluation. */
export function meetsOwnerRequirement(criticality: Criticality | undefined, ownerId: EntityId | undefined): boolean {
  return !isCriticalOrHigh(criticality) || Boolean(ownerId);
}

/** RSK-003 (§11.5) — idem, partagé avec le moteur de règles. */
export function meetsResponseRequirement(criticality: Criticality | undefined, response: string | undefined): boolean {
  return !isCriticalOrHigh(criticality) || Boolean(response);
}

/** RSK-002 (§11.5) au niveau structurel : un risque qualifié élevé/critique
 * sans stratégie ni propriétaire ni réponse ne peut pas être déclaré "sous
 * contrôle" — cette fonction couvre l'étape "réponse planifiée" qui en est
 * le préalable obligatoire. */
export function planRiskResponse(
  risk: Risk,
  strategy: RiskResponseStrategy,
  response: string,
  ownerId: EntityId,
  now: IsoDateTime
): CommandResult<Risk> {
  if (!canTransitionRisk(risk.status, "response_planned")) {
    return fail(domainError("risk_invalid_transition", `Transition ${risk.status} -> response_planned interdite`, risk.id));
  }
  if (!meetsOwnerRequirement(risk.criticality, ownerId)) {
    return fail(domainError("risk_critical_without_owner", "Un risque critique/élevé exige un propriétaire", risk.id));
  }
  if (!meetsResponseRequirement(risk.criticality, response)) {
    return fail(domainError("risk_critical_without_response", "Un risque critique/élevé exige une réponse", risk.id));
  }
  const next: Risk = { ...risk, strategy, response, ownerId, status: "response_planned", updatedAt: now };
  const events: DomainEvent[] = [
    { type: "risk.response_planned", occurredAt: now, projectId: risk.projectId, payload: { riskId: risk.id } },
  ];
  return ok(next, events);
}

export function controlRisk(risk: Risk, now: IsoDateTime): CommandResult<Risk> {
  if (!canTransitionRisk(risk.status, "under_control")) {
    return fail(domainError("risk_invalid_transition", `Transition ${risk.status} -> under_control interdite`, risk.id));
  }
  return ok({ ...risk, status: "under_control", updatedAt: now }, []);
}

export function closeRisk(risk: Risk, residualRisk: string | undefined, now: IsoDateTime): CommandResult<Risk> {
  if (!canTransitionRisk(risk.status, "closed")) {
    return fail(domainError("risk_invalid_transition", `Transition ${risk.status} -> closed interdite`, risk.id));
  }
  return ok({ ...risk, status: "closed", residualRisk, updatedAt: now }, []);
}

export interface TriggerRiskInput {
  issueId: EntityId;
  problem: string;
  now: IsoDateTime;
}

/** Un risque matérialisé devient un Issue — entité distincte créée ici,
 * jamais un simple changement de statut du Risk (cahier §9.3, explicite).
 * Le Risk lui-même n'est pas transitionné automatiquement : c'est à
 * l'appelant de décider s'il reste sous contrôle ou se referme ensuite. */
export function triggerRisk(risk: Risk, input: TriggerRiskInput): CommandResult<Issue> {
  const issue: Issue = {
    id: input.issueId,
    projectId: risk.projectId,
    originRiskId: risk.id,
    problem: input.problem,
    escalated: false,
    status: "open",
    createdAt: input.now,
    updatedAt: input.now,
  };
  const events: DomainEvent[] = [
    { type: "risk.triggered", occurredAt: input.now, projectId: risk.projectId, payload: { riskId: risk.id, issueId: issue.id } },
  ];
  return ok(issue, events);
}
