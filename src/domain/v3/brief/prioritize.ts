import type { IsoDateTime } from "../types";
import type { BriefItem, BriefSourceType } from "./types";

/** Seule définition de l'ordre de sévérité du module Brief — réutilisée par
 * build-brief.ts (pickWinner) pour éviter deux vérités divergentes. */
export const SEVERITY_RANK: Record<BriefItem["severity"], number> = { blocking: 0, warning: 1, info: 2 };

/** Ordre de déclaration fixe (décision de gate §6) — pas alphabétique,
 * juste un tie-break stable et prévisible. */
const SOURCE_TYPE_RANK: Record<BriefSourceType, number> = {
  work_item: 0,
  decision: 1,
  risk: 2,
  issue: 3,
  milestone: 4,
  dependency: 5,
  change_request: 6,
};

function dateBucket(item: BriefItem, now: IsoDateTime): 0 | 1 | 2 {
  if (!item.dueDate) return 2;
  return item.dueDate < now ? 0 : 1;
}

/**
 * Fonction pure opérant uniquement sur BriefItem[] (jamais besoin de
 * ré-accéder aux entités domaine). Comparateur total et déterministe :
 * jamais de retour 0 sans branche de secours, indépendant de la stabilité
 * du moteur de tri.
 */
export function prioritizeBriefItems(items: BriefItem[], now: IsoDateTime): BriefItem[] {
  return [...items].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;

    const bucketDiff = dateBucket(a, now) - dateBucket(b, now);
    if (bucketDiff !== 0) return bucketDiff;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? -1 : 1;
    }

    const sourceTypeDiff = SOURCE_TYPE_RANK[a.sourceType] - SOURCE_TYPE_RANK[b.sourceType];
    if (sourceTypeDiff !== 0) return sourceTypeDiff;

    if (a.sourceId !== b.sourceId) return a.sourceId < b.sourceId ? -1 : 1;
    return 0;
  });
}
