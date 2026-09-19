import type { Risk } from "../types";
import { meetsOwnerRequirement, meetsResponseRequirement } from "../commands/risk";
import type { RuleDefinition } from "./types";

function isCriticalOrHigh(risk: Risk): boolean {
  return risk.criticality === "high" || risk.criticality === "critical";
}

export const riskRules: RuleDefinition<Risk>[] = [
  {
    id: "RSK-002",
    targetType: "risk",
    severity: "blocking",
    description: "Un risque high/critical non clos doit avoir un propriétaire.",
    evaluate: (risk) => {
      if (!isCriticalOrHigh(risk) || risk.status === "closed") {
        return { status: "not_applicable", message: "Risque non high/critical ou déjà clos." };
      }
      return meetsOwnerRequirement(risk.criticality, risk.ownerId)
        ? { status: "satisfied", message: "Propriétaire assigné." }
        : { status: "violated", message: "Aucun propriétaire assigné." };
    },
  },
  {
    id: "RSK-003",
    targetType: "risk",
    severity: "blocking",
    description: "Un risque high/critical non clos doit avoir une réponse.",
    evaluate: (risk) => {
      if (!isCriticalOrHigh(risk) || risk.status === "closed") {
        return { status: "not_applicable", message: "Risque non high/critical ou déjà clos." };
      }
      return meetsResponseRequirement(risk.criticality, risk.response)
        ? { status: "satisfied", message: "Réponse définie." }
        : { status: "violated", message: "Aucune réponse définie." };
    },
  },
  {
    id: "RSK-004",
    targetType: "risk",
    severity: "warning",
    description: "Un risque high/critical encore ouvert doit être signalé.",
    evaluate: (risk) => {
      if (!isCriticalOrHigh(risk)) {
        return { status: "not_applicable", message: "Risque non high/critical." };
      }
      return risk.status === "closed"
        ? { status: "satisfied", message: "Risque clos." }
        : { status: "violated", message: "Risque high/critical encore ouvert." };
    },
  },
];
