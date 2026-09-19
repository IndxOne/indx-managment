import type { Issue } from "../types";
import type { RuleDefinition } from "./types";

const OPEN_STATUSES: Issue["status"][] = ["open", "in_progress", "escalated"];

function isOpen(issue: Issue): boolean {
  return OPEN_STATUSES.includes(issue.status);
}

export const issueRules: RuleDefinition<Issue>[] = [
  {
    id: "ISS-001",
    targetType: "issue",
    severity: "warning",
    description: "Une issue ouverte doit avoir un responsable de résolution assigné.",
    evaluate: (issue) => {
      if (!isOpen(issue)) {
        return { status: "not_applicable", message: "Issue résolue." };
      }
      return issue.resolverId
        ? { status: "satisfied", message: "Responsable de résolution assigné." }
        : { status: "violated", message: "Aucun responsable de résolution assigné." };
    },
  },
  {
    id: "ISS-002",
    targetType: "issue",
    severity: "warning",
    description: "Une issue ouverte dont l'échéance est dépassée doit être signalée.",
    evaluate: (issue, context) => {
      if (!isOpen(issue) || !issue.targetDate) {
        return { status: "not_applicable", message: "Pas d'échéance applicable." };
      }
      return issue.targetDate < context.now
        ? { status: "violated", message: "Échéance dépassée.", context: { targetDate: issue.targetDate } }
        : { status: "satisfied", message: "Échéance non dépassée." };
    },
  },
];
