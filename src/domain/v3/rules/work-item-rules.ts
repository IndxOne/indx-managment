import type { WorkItem } from "../types";
import { hasResponsible, hasExitConditionOrDueDate } from "../commands/work-item";
import type { RuleDefinition } from "./types";

const TERMINAL_STATUSES: WorkItem["status"][] = ["done", "cancelled"];

function isTerminal(item: WorkItem): boolean {
  return TERMINAL_STATUSES.includes(item.status);
}

export const workItemRules: RuleDefinition<WorkItem>[] = [
  {
    id: "ACT-001",
    targetType: "work_item",
    severity: "blocking",
    description: "Un WorkItem non terminé doit avoir un responsable assigné.",
    evaluate: (item) => {
      if (isTerminal(item)) {
        return { status: "not_applicable", message: "WorkItem dans un état terminal." };
      }
      return hasResponsible(item)
        ? { status: "satisfied", message: "Responsable assigné." }
        : { status: "violated", message: "Aucun responsable assigné." };
    },
  },
  {
    id: "ACT-002",
    targetType: "work_item",
    severity: "blocking",
    description: "Un WorkItem non terminé doit avoir une échéance ou une condition de sortie.",
    evaluate: (item) => {
      if (isTerminal(item)) {
        return { status: "not_applicable", message: "WorkItem dans un état terminal." };
      }
      return hasExitConditionOrDueDate(item)
        ? { status: "satisfied", message: "Échéance ou condition de sortie définie." }
        : { status: "violated", message: "Ni échéance ni condition de sortie définie." };
    },
  },
  {
    id: "ACT-004",
    targetType: "work_item",
    severity: "blocking",
    description: "Un WorkItem bloqué doit porter un motif de blocage.",
    evaluate: (item) => {
      if (item.status !== "blocked") {
        return { status: "not_applicable", message: "WorkItem non bloqué." };
      }
      return item.blockedReason
        ? { status: "satisfied", message: "Motif de blocage renseigné." }
        : { status: "violated", message: "Aucun motif de blocage renseigné." };
    },
  },
  {
    id: "ACT-005",
    targetType: "work_item",
    severity: "warning",
    description: "Un WorkItem non terminé dont l'échéance est dépassée doit être signalé.",
    evaluate: (item, context) => {
      if (isTerminal(item) || !item.dueDate) {
        return { status: "not_applicable", message: "Pas d'échéance applicable." };
      }
      return item.dueDate < context.now
        ? { status: "violated", message: "Échéance dépassée.", context: { dueDate: item.dueDate } }
        : { status: "satisfied", message: "Échéance non dépassée." };
    },
  },
];
