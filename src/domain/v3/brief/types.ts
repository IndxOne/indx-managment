/**
 * Mon Brief (Lot 3, cahier §12) — projection de lecture pure dérivée du
 * domaine V3 et du moteur de règles Lot 2. Jamais une nouvelle source de
 * vérité : rien ici ne mute une entité, rien ici n'introduit un invariant
 * qui n'existe pas déjà dans commands/*.ts ou rules/*.ts.
 */

import type { EntityId, IsoDateTime } from "../types";
import type { RuleSeverity } from "../rules/types";

export type BriefSourceType =
  | "work_item"
  | "decision"
  | "risk"
  | "issue"
  | "milestone"
  | "dependency"
  | "change_request";

/**
 * Un seul BriefItem par entité source (décision de gate §4/§5) : ne copie
 * jamais l'entité complète, seulement ce qui sert à l'affichage/navigation.
 */
export interface BriefItem {
  id: string;
  sourceType: BriefSourceType;
  sourceId: EntityId;
  projectId: EntityId;
  severity: RuleSeverity;
  title: string;
  reason: string;
  dueDate?: IsoDateTime;
  ruleId?: string;
  status: string;
  actionHint?: string;
}

export interface BriefSummary {
  blockingCount: number;
  warningCount: number;
  overdueCount: number;
  decisionsNeedingAttentionCount: number;
  criticalRisksCount: number;
  milestonesNeedingAttentionCount: number;
}

export interface BriefProjection {
  projectId: EntityId;
  generatedAt: IsoDateTime;
  /** Liste maîtresse unique, priorisée. Tous les autres champs ci-dessous
   * sont des filtres purs sur celle-ci (décision de gate §5) — jamais un
   * recalcul indépendant. */
  attentionItems: BriefItem[];
  blockedItems: BriefItem[];
  overdueItems: BriefItem[];
  decisions: BriefItem[];
  risks: BriefItem[];
  milestones: BriefItem[];
  summary: BriefSummary;
}
