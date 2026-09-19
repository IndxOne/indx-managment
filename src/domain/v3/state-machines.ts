/**
 * Tables de transition (cahier §9.3). Ce module est purement déclaratif :
 * il répond à "cette transition est-elle possible ?", jamais "cette
 * transition est-elle AUTORISÉE compte tenu des champs remplis" (ça, c'est
 * le rôle des commandes — cf. commands/*.ts — qui combinent state-machines
 * + invariants avant de muter quoi que ce soit).
 */

import type {
  ChangeRequestStatus,
  DecisionStatus,
  IssueStatus,
  MilestoneStatus,
  RiskStatus,
  WorkItemStatus,
} from "./types";

function buildTransitionChecker<TStatus extends string>(
  table: Record<TStatus, readonly TStatus[]>
): (from: TStatus, to: TStatus) => boolean {
  return (from, to) => table[from]?.includes(to) ?? false;
}

// ===========================================================================
// WorkItem — À cadrer → Prêt → En cours → Bloqué → Validation → Terminé,
// + Annulé / En attente externe / rejet de validation → En cours.
// ===========================================================================

const workItemTransitions: Record<WorkItemStatus, readonly WorkItemStatus[]> = {
  to_scope: ["ready", "cancelled"],
  ready: ["in_progress", "to_scope", "cancelled"],
  in_progress: ["blocked", "validation", "waiting_external", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  waiting_external: ["in_progress", "cancelled"],
  validation: ["done", "in_progress"],
  done: [],
  cancelled: [],
};

export const canTransitionWorkItem = buildTransitionChecker(workItemTransitions);

// ===========================================================================
// Decision — À préparer → Prête à décider → Décidée → Appliquée → Vérifiée
// (linéaire, cahier §9.3, aucune branche documentée).
// ===========================================================================

const decisionTransitions: Record<DecisionStatus, readonly DecisionStatus[]> = {
  to_prepare: ["ready"],
  ready: ["decided", "to_prepare"],
  decided: ["applied"],
  applied: ["verified"],
  verified: [],
};

export const canTransitionDecision = buildTransitionChecker(decisionTransitions);

// ===========================================================================
// Risk — Identifié → Qualifié → Réponse planifiée → Sous contrôle → Clos.
// La matérialisation en Issue (§9.3) n'est PAS une auto-transition : c'est
// une commande dédiée (triggerRisk, commands/risk.ts) qui crée une entité
// Issue distincte, cf. cahier "un risque matérialisé devient un Issue, il
// n'est pas simplement marqué 'réalisé'".
// ===========================================================================

const riskTransitions: Record<RiskStatus, readonly RiskStatus[]> = {
  identified: ["qualified"],
  qualified: ["response_planned"],
  response_planned: ["under_control"],
  under_control: ["closed", "response_planned"],
  closed: [],
};

export const canTransitionRisk = buildTransitionChecker(riskTransitions);

// ===========================================================================
// Issue — non spécifiée en détail par le cahier (§9.2 donne les champs,
// pas de machine dédiée) : inférée du champ "escalade éventuelle" comme un
// état à part entière plutôt qu'un simple booléen, pour rester cohérente
// avec le patron des autres entités (transitions explicites, pas de champ
// flag qui contournerait la machine d'état). Écart à signaler.
// ===========================================================================

const issueTransitions: Record<IssueStatus, readonly IssueStatus[]> = {
  open: ["in_progress", "escalated"],
  in_progress: ["resolved", "escalated"],
  escalated: ["in_progress", "resolved"],
  resolved: [],
};

export const canTransitionIssue = buildTransitionChecker(issueTransitions);

// ===========================================================================
// Milestone — Planifié → Prêt pour contrôle → Accepté ; └→ Refusé.
// refused est un état terminal pour ce checker générique : la resoumission
// après correction n'est PAS une transition implicite (corrigé le
// 20/09/2026, décision GO conditionnel) — elle passe par la commande
// dédiée resubmitMilestone() (commands/milestone.ts), qui vérifie
// explicitement `status === "refused"` et émet milestone.resubmitted,
// plutôt qu'un chemin générique dans cette table.
// ===========================================================================

const milestoneTransitions: Record<MilestoneStatus, readonly MilestoneStatus[]> = {
  planned: ["ready_for_review"],
  ready_for_review: ["accepted", "refused"],
  refused: [],
  accepted: [],
};

export const canTransitionMilestone = buildTransitionChecker(milestoneTransitions);

// ===========================================================================
// ChangeRequest — non spécifiée en détail par le cahier (§9.2 donne les
// champs). Inférée du workflow §19 (analyse d'impact avant décision) :
// soumis → analysé → décidé → appliqué, ou décidé → rejeté. Écart à
// signaler.
// ===========================================================================

const changeRequestTransitions: Record<ChangeRequestStatus, readonly ChangeRequestStatus[]> = {
  submitted: ["under_analysis"],
  under_analysis: ["decided"],
  decided: ["applied", "rejected"],
  applied: [],
  rejected: [],
};

export const canTransitionChangeRequest = buildTransitionChecker(changeRequestTransitions);
