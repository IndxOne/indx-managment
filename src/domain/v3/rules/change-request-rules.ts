import type { ChangeRequest } from "../types";
import { hasImpactAnalysis } from "../commands/change-request";
import type { RuleDefinition } from "./types";

export const changeRequestRules: RuleDefinition<ChangeRequest>[] = [
  {
    id: "CHG-001",
    targetType: "change_request",
    severity: "blocking",
    description: "Une demande de changement soumise doit avoir une analyse d'impact avant approbation.",
    evaluate: (changeRequest) => {
      if (changeRequest.status !== "submitted") {
        return { status: "not_applicable", message: "Demande déjà en analyse ou au-delà." };
      }
      return hasImpactAnalysis(changeRequest.impact)
        ? { status: "satisfied", message: "Analyse d'impact renseignée." }
        : { status: "violated", message: "Aucune analyse d'impact renseignée." };
    },
  },
];
