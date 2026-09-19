import type { Dependency } from "../types";
import type { RuleDefinition } from "./types";

export const dependencyRules: RuleDefinition<Dependency>[] = [
  {
    id: "DEP-002",
    targetType: "dependency",
    severity: "warning",
    description: "Une dépendance en retard doit être signalée.",
    evaluate: (dependency) => {
      if (dependency.status !== "delayed") {
        return { status: "not_applicable", message: "Dépendance non en retard." };
      }
      return { status: "violated", message: "Dépendance en retard." };
    },
  },
];
