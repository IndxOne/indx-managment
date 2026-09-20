import type { RuleSeverity } from "../../domain/v3/rules/types";
import type { Criticality, ProjectStatus } from "../../domain/v3/types";

/**
 * Palette sémantique unifiée (Lot UX-1) : un seul vocabulaire visuel pour
 * tout ce qui aujourd'hui mappe séparément severity/criticité/statut projet
 * vers une couleur (chacun avec son propre mapping ad hoc). Présentation
 * pure — aucune règle métier, uniquement une traduction domaine -> tonalité.
 */
export type Tone = "neutral" | "positive" | "attention" | "critical";

export function severityToTone(severity: RuleSeverity): Tone {
  switch (severity) {
    case "blocking":
      return "critical";
    case "warning":
      return "attention";
    case "info":
      return "neutral";
  }
}

export function projectStatusToTone(status: ProjectStatus): Tone {
  switch (status) {
    case "on_track":
      return "positive";
    case "at_risk":
      return "attention";
    case "off_track":
      return "critical";
    case "closed":
      return "neutral";
  }
}

export function criticalityToTone(criticality: Criticality): Tone {
  switch (criticality) {
    case "low":
      return "neutral";
    case "medium":
      return "attention";
    case "high":
    case "critical":
      return "critical";
  }
}
