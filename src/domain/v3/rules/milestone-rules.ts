import type { Milestone } from "../types";
import { hasCriteria, hasEvidence } from "../commands/milestone";
import type { RuleDefinition } from "./types";

export const milestoneRules: RuleDefinition<Milestone>[] = [
  {
    id: "JAL-001",
    targetType: "milestone",
    severity: "blocking",
    description: "Un jalon planifié doit avoir des critères d'acceptation avant contrôle.",
    evaluate: (milestone) => {
      if (milestone.status !== "planned") {
        return { status: "not_applicable", message: "Jalon déjà soumis ou au-delà." };
      }
      return hasCriteria(milestone)
        ? { status: "satisfied", message: "Critères d'acceptation définis." }
        : { status: "violated", message: "Aucun critère d'acceptation défini." };
    },
  },
  {
    id: "JAL-002",
    targetType: "milestone",
    severity: "blocking",
    description: "Un jalon prêt pour contrôle doit avoir une preuve avant acceptation.",
    evaluate: (milestone) => {
      if (milestone.status !== "ready_for_review") {
        return { status: "not_applicable", message: "Jalon pas encore prêt pour contrôle ou au-delà." };
      }
      return hasEvidence(milestone)
        ? { status: "satisfied", message: "Preuve rattachée." }
        : { status: "violated", message: "Aucune preuve rattachée." };
    },
  },
  {
    id: "JAL-003",
    targetType: "milestone",
    severity: "warning",
    description: "Un jalon en cours dont la date cible est dépassée doit être signalé.",
    evaluate: (milestone, context) => {
      if (milestone.status !== "planned" && milestone.status !== "ready_for_review") {
        return { status: "not_applicable", message: "Jalon accepté ou refusé." };
      }
      return milestone.targetDate < context.now
        ? { status: "violated", message: "Date cible dépassée.", context: { targetDate: milestone.targetDate } }
        : { status: "satisfied", message: "Date cible non dépassée." };
    },
  },
  {
    id: "JAL-004",
    targetType: "milestone",
    severity: "warning",
    description: "Un jalon refusé doit être resoumis explicitement (resubmitMilestone()).",
    evaluate: (milestone) => {
      if (milestone.status !== "refused") {
        return { status: "not_applicable", message: "Jalon non refusé." };
      }
      return { status: "violated", message: "Jalon refusé : resoumission requise via resubmitMilestone()." };
    },
  },
];
