import type { Decision } from "../types";
import { hasDecider, hasDueDate } from "../commands/decision";
import type { RuleDefinition } from "./types";

export const decisionRules: RuleDefinition<Decision>[] = [
  {
    id: "DEC-001",
    targetType: "decision",
    severity: "blocking",
    description: "Une décision à préparer doit avoir un décideur désigné.",
    evaluate: (decision) => {
      if (decision.status !== "to_prepare") {
        return { status: "not_applicable", message: "Décision déjà publiée ou au-delà." };
      }
      return hasDecider(decision)
        ? { status: "satisfied", message: "Décideur désigné." }
        : { status: "violated", message: "Aucun décideur désigné." };
    },
  },
  {
    id: "DEC-002",
    targetType: "decision",
    severity: "blocking",
    description: "Une décision à préparer doit avoir une échéance.",
    evaluate: (decision) => {
      if (decision.status !== "to_prepare") {
        return { status: "not_applicable", message: "Décision déjà publiée ou au-delà." };
      }
      return hasDueDate(decision)
        ? { status: "satisfied", message: "Échéance définie." }
        : { status: "violated", message: "Aucune échéance définie." };
    },
  },
  {
    id: "DEC-003",
    targetType: "decision",
    severity: "warning",
    description: "Une décision en préparation ou prête dont l'échéance est dépassée doit être signalée.",
    evaluate: (decision, context) => {
      if (!decision.dueDate || (decision.status !== "to_prepare" && decision.status !== "ready")) {
        return { status: "not_applicable", message: "Pas d'échéance applicable à ce stade." };
      }
      return decision.dueDate < context.now
        ? { status: "violated", message: "Échéance dépassée.", context: { dueDate: decision.dueDate } }
        : { status: "satisfied", message: "Échéance non dépassée." };
    },
  },
];
