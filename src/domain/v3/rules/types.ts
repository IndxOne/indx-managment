/**
 * Moteur de règles V3 (Lot 2, cahier §11.5) — pur, déterministe, sans
 * dépendance React/Supabase/réseau/horloge système. Les règles ne mutent
 * jamais leur cible et ne sont pas l'autorité de mutation : celle-ci reste
 * entièrement portée par les commandes de src/domain/v3/commands/*.ts
 * (Lot 1). Le moteur détecte/explique/qualifie/signale, jamais n'exécute.
 */

import type { EntityId, IsoDateTime } from "../types";

export type RuleSeverity = "blocking" | "warning" | "info";

export type RuleStatus = "satisfied" | "violated" | "not_applicable";

export type RuleTargetType =
  | "work_item"
  | "decision"
  | "risk"
  | "issue"
  | "milestone"
  | "dependency"
  | "change_request";

/** Contexte minimal (Lot 2, décision de gate) : uniquement `now`, jamais lu
 * depuis Date.now() à l'intérieur d'une règle. Le support de contexte
 * relationnel (entités liées) sera ajouté quand un consommateur réel en
 * aura besoin — pas anticipé ici. */
export interface RuleEvaluationContext {
  now: IsoDateTime;
}

export interface RuleEvalOutput {
  status: RuleStatus;
  message: string;
  context?: Record<string, unknown>;
}

interface HasId {
  id: EntityId;
}

export interface RuleDefinition<T extends HasId> {
  id: string;
  targetType: RuleTargetType;
  severity: RuleSeverity;
  description: string;
  evaluate: (target: T, context: RuleEvaluationContext) => RuleEvalOutput;
}

export interface RuleResult {
  ruleId: string;
  targetType: RuleTargetType;
  targetId: EntityId;
  severity: RuleSeverity;
  status: RuleStatus;
  message: string;
  context?: Record<string, unknown>;
}
