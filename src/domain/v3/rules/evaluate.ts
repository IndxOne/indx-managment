import type { EntityId, IsoDateTime, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest } from "../types";
import type { DomainEvent } from "../events";
import type { RuleDefinition, RuleEvaluationContext, RuleResult, RuleTargetType } from "./types";
import { workItemRules, decisionRules, riskRules, issueRules, milestoneRules, dependencyRules, changeRequestRules } from "./registry";

interface HasId {
  id: EntityId;
}

/** Exécuteur générique partagé par les 7 fonctions evaluateXRules ci-dessous
 * — jamais de mutation de `target`, jamais de lecture d'horloge système
 * (context.now est toujours fourni par l'appelant). */
function runRules<T extends HasId>(
  rules: RuleDefinition<T>[],
  targetType: RuleTargetType,
  target: T,
  context: RuleEvaluationContext
): RuleResult[] {
  return rules.map((rule) => {
    const output = rule.evaluate(target, context);
    return {
      ruleId: rule.id,
      targetType,
      targetId: target.id,
      severity: rule.severity,
      status: output.status,
      message: output.message,
      context: output.context,
    };
  });
}

export function evaluateWorkItemRules(target: WorkItem, context: RuleEvaluationContext): RuleResult[] {
  return runRules(workItemRules, "work_item", target, context);
}

export function evaluateDecisionRules(target: Decision, context: RuleEvaluationContext): RuleResult[] {
  return runRules(decisionRules, "decision", target, context);
}

export function evaluateRiskRules(target: Risk, context: RuleEvaluationContext): RuleResult[] {
  return runRules(riskRules, "risk", target, context);
}

export function evaluateIssueRules(target: Issue, context: RuleEvaluationContext): RuleResult[] {
  return runRules(issueRules, "issue", target, context);
}

export function evaluateMilestoneRules(target: Milestone, context: RuleEvaluationContext): RuleResult[] {
  return runRules(milestoneRules, "milestone", target, context);
}

export function evaluateDependencyRules(target: Dependency, context: RuleEvaluationContext): RuleResult[] {
  return runRules(dependencyRules, "dependency", target, context);
}

export function evaluateChangeRequestRules(target: ChangeRequest, context: RuleEvaluationContext): RuleResult[] {
  return runRules(changeRequestRules, "change_request", target, context);
}

/**
 * Dispatch typé par targetType (§3 de la gate) : préféré à une fonction
 * polymorphe unique inférant le type depuis une union, pour qu'une règle
 * WorkItem exécutée sur un Risk soit une erreur de compilation plutôt
 * qu'un bug runtime.
 */
export const evaluateRules = {
  work_item: evaluateWorkItemRules,
  decision: evaluateDecisionRules,
  risk: evaluateRiskRules,
  issue: evaluateIssueRules,
  milestone: evaluateMilestoneRules,
  dependency: evaluateDependencyRules,
  change_request: evaluateChangeRequestRules,
} as const;

/**
 * Convertit les résultats en DomainEvent — uniquement pour status
 * "violated" (§6 de la gate) : un événement par règle satisfaite ou non
 * applicable serait du bruit sans valeur de traçabilité. Fonction pure
 * distincte : evaluateXRules() ne produit jamais d'événement lui-même.
 */
export function ruleResultsToEvents(results: RuleResult[], projectId: EntityId, now: IsoDateTime): DomainEvent[] {
  return results
    .filter((result) => result.status === "violated")
    .map((result) => ({
      type: "rule.executed" as const,
      occurredAt: now,
      projectId,
      payload: {
        ruleId: result.ruleId,
        targetType: result.targetType,
        targetId: result.targetId,
        severity: result.severity,
        status: result.status,
      },
    }));
}
