import type { BriefSourceType, BriefProjection, BriefItem } from "../../domain/v3/brief/types";
import type { RuleSeverity } from "../../domain/v3/rules/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";

/** Libellés d'affichage — présentation pure, aucune logique métier. */
export const SOURCE_TYPE_LABELS: Record<BriefSourceType, string> = {
  work_item: "Tâche",
  decision: "Décision",
  risk: "Risque",
  issue: "Issue",
  milestone: "Jalon",
  dependency: "Dépendance",
  change_request: "Changement",
};

export const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  blocking: "Bloquant",
  warning: "À surveiller",
  info: "Info",
};

export type BriefFilterId = "all" | "blocked" | "overdue" | "decisions" | "risks" | "milestones";

/**
 * Mapping filtre → projection déjà fournie par BriefProjection (décision de
 * gate) : chaque filtre sélectionne EXACTEMENT le tableau correspondant,
 * jamais un recalcul (ex. "Bloquants" == blockedItems, pas un filtre sur
 * severity === "blocking").
 */
export const BRIEF_FILTERS: { id: BriefFilterId; label: string; select: (brief: BriefProjection) => BriefItem[] }[] = [
  { id: "all", label: "Tous", select: (brief) => brief.attentionItems },
  { id: "blocked", label: "Bloquants", select: (brief) => brief.blockedItems },
  { id: "overdue", label: "Retards", select: (brief) => brief.overdueItems },
  { id: "decisions", label: "Décisions", select: (brief) => brief.decisions },
  { id: "risks", label: "Risques", select: (brief) => brief.risks },
  { id: "milestones", label: "Jalons", select: (brief) => brief.milestones },
];

/**
 * Traduit une erreur d'infrastructure en message utilisateur déterministe —
 * jamais PersistenceError.message affiché tel quel (peut contenir des
 * détails techniques/PostgREST). Le détail technique part en console pour
 * le diagnostic, jamais à l'écran (aucun mécanisme de logs dédié existant
 * dans ce projet à réutiliser — console.error reste la voie standard ici).
 */
export function briefErrorToUserMessage(error: PersistenceError): string {
  if (error.kind === "persistence" && error.code === "not_found") {
    return "Brief indisponible pour ce projet.";
  }
  return "Impossible de charger Mon Brief.";
}
