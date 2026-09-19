import type { EntityId, IsoDateTime, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest, Project } from "../types";
import { evaluateRules } from "../rules/evaluate";
import type { RuleSeverity } from "../rules/types";
import { prioritizeBriefItems, SEVERITY_RANK } from "./prioritize";
import type { BriefItem, BriefProjection, BriefSourceType, BriefSummary } from "./types";

/** Raison candidate à l'inclusion d'une entité dans le Brief — soit un état
 * pur (ex. WorkItem bloqué), soit une règle Lot 2 violée. Jamais un nouvel
 * invariant : les deux seuls candidats d'état (WorkItem blocked, Issue
 * escalated) projettent un statut déjà existant, ils n'en inventent aucun. */
interface Candidate {
  severity: RuleSeverity;
  reason: string;
  ruleId?: string;
}

/** Un seul gagnant par entité (décision de gate §4) : sévérité maximale,
 * puis premier candidat dans l'ordre où il a été poussé (les appelants
 * poussent déjà dans l'ordre de priorité déclaré). */
function pickWinner(candidates: Candidate[]): Candidate | undefined {
  if (candidates.length === 0) return undefined;
  const bestRank = Math.min(...candidates.map((c) => SEVERITY_RANK[c.severity]));
  return candidates.find((c) => SEVERITY_RANK[c.severity] === bestRank);
}

const ACTION_HINTS: Record<string, string> = {
  "ACT-001": "Assigner un responsable",
  "ACT-002": "Définir une échéance ou une condition de sortie",
  "ACT-004": "Renseigner le motif de blocage",
  "ACT-005": "Revoir l'échéance dépassée",
  "DEC-001": "Désigner un décideur",
  "DEC-002": "Définir une échéance",
  "DEC-003": "Revoir l'échéance dépassée",
  "RSK-002": "Assigner un propriétaire",
  "RSK-003": "Définir une réponse au risque",
  "RSK-004": "Clore ou requalifier le risque",
  "JAL-001": "Définir les critères d'acceptation",
  "JAL-002": "Rattacher une preuve",
  "JAL-003": "Revoir la date cible",
  "JAL-004": "Resoumettre via resubmitMilestone()",
  "DEP-002": "Analyser l'impact du retard",
  "CHG-001": "Renseigner l'analyse d'impact",
  "ISS-001": "Assigner un responsable de résolution",
  "ISS-002": "Revoir l'échéance dépassée",
};

function toBriefItem(
  sourceType: BriefSourceType,
  sourceId: EntityId,
  projectId: EntityId,
  title: string,
  status: string,
  dueDate: IsoDateTime | undefined,
  winner: Candidate
): BriefItem {
  return {
    id: `${sourceType}:${sourceId}`,
    sourceType,
    sourceId,
    projectId,
    severity: winner.severity,
    title,
    reason: winner.reason,
    dueDate,
    ruleId: winner.ruleId,
    status,
    actionHint: winner.ruleId ? ACTION_HINTS[winner.ruleId] : undefined,
  };
}

// ===========================================================================
// Candidats par domaine — ordre de poussée = ordre de priorité (§3 de la
// gate). WorkItem "blocked" et Issue "escalated" sont les deux seuls
// candidats d'état pur (validés en gate), tout le reste vient exclusivement
// de rules/evaluate.ts (aucune logique dupliquée).
// ===========================================================================

function workItemCandidates(item: WorkItem, now: IsoDateTime): Candidate[] {
  const candidates: Candidate[] = [];
  if (item.status === "blocked") {
    candidates.push({ severity: "warning", reason: item.blockedReason ? `Bloqué : ${item.blockedReason}` : "Bloqué." });
  }
  for (const result of evaluateRules.work_item(item, { now })) {
    if (result.status === "violated") {
      candidates.push({ severity: result.severity, reason: result.message, ruleId: result.ruleId });
    }
  }
  return candidates;
}

function decisionCandidates(decision: Decision, now: IsoDateTime): Candidate[] {
  return evaluateRules
    .decision(decision, { now })
    .filter((r) => r.status === "violated")
    .map((r) => ({ severity: r.severity, reason: r.message, ruleId: r.ruleId }));
}

function riskCandidates(risk: Risk, now: IsoDateTime): Candidate[] {
  return evaluateRules
    .risk(risk, { now })
    .filter((r) => r.status === "violated")
    .map((r) => ({ severity: r.severity, reason: r.message, ruleId: r.ruleId }));
}

/** Ordre volontaire : les violations ISS-* (plus spécifiques/actionnables)
 * sont poussées avant le candidat d'état "escalated" générique — si les
 * deux s'appliquent à la même sévérité, la raison la plus précise gagne. */
function issueCandidates(issue: Issue, now: IsoDateTime): Candidate[] {
  const candidates: Candidate[] = [];
  for (const result of evaluateRules.issue(issue, { now })) {
    if (result.status === "violated") {
      candidates.push({ severity: result.severity, reason: result.message, ruleId: result.ruleId });
    }
  }
  if (issue.status === "escalated") {
    candidates.push({ severity: "warning", reason: "Issue escalée." });
  }
  return candidates;
}

function milestoneCandidates(milestone: Milestone, now: IsoDateTime): Candidate[] {
  return evaluateRules
    .milestone(milestone, { now })
    .filter((r) => r.status === "violated")
    .map((r) => ({ severity: r.severity, reason: r.message, ruleId: r.ruleId }));
}

function dependencyCandidates(dependency: Dependency, now: IsoDateTime): Candidate[] {
  return evaluateRules
    .dependency(dependency, { now })
    .filter((r) => r.status === "violated")
    .map((r) => ({ severity: r.severity, reason: r.message, ruleId: r.ruleId }));
}

function changeRequestCandidates(changeRequest: ChangeRequest, now: IsoDateTime): Candidate[] {
  return evaluateRules
    .change_request(changeRequest, { now })
    .filter((r) => r.status === "violated")
    .map((r) => ({ severity: r.severity, reason: r.message, ruleId: r.ruleId }));
}

export interface BuildBriefInput {
  project: Project;
  now: IsoDateTime;
  workItems: WorkItem[];
  decisions: Decision[];
  risks: Risk[];
  issues: Issue[];
  milestones: Milestone[];
  dependencies: Dependency[];
  changeRequests: ChangeRequest[];
}

/** Construit la projection Brief. Jamais d'accès repository ici : l'appelant
 * charge et fournit toutes les collections (§5 de la gate). */
export function buildBrief(input: BuildBriefInput): BriefProjection {
  const { project, now } = input;
  const items: BriefItem[] = [];

  for (const item of input.workItems) {
    const winner = pickWinner(workItemCandidates(item, now));
    if (winner) items.push(toBriefItem("work_item", item.id, project.id, item.title, item.status, item.dueDate, winner));
  }
  for (const decision of input.decisions) {
    const winner = pickWinner(decisionCandidates(decision, now));
    if (winner) items.push(toBriefItem("decision", decision.id, project.id, decision.question, decision.status, decision.dueDate, winner));
  }
  for (const risk of input.risks) {
    const winner = pickWinner(riskCandidates(risk, now));
    if (winner) items.push(toBriefItem("risk", risk.id, project.id, risk.event, risk.status, undefined, winner));
  }
  for (const issue of input.issues) {
    const winner = pickWinner(issueCandidates(issue, now));
    if (winner) items.push(toBriefItem("issue", issue.id, project.id, issue.problem, issue.status, issue.targetDate, winner));
  }
  for (const milestone of input.milestones) {
    const winner = pickWinner(milestoneCandidates(milestone, now));
    if (winner) items.push(toBriefItem("milestone", milestone.id, project.id, milestone.observableResult, milestone.status, milestone.targetDate, winner));
  }
  for (const dependency of input.dependencies) {
    const winner = pickWinner(dependencyCandidates(dependency, now));
    if (winner) {
      items.push(
        toBriefItem("dependency", dependency.id, project.id, `Dépendance (${dependency.type})`, dependency.status, dependency.neededByDate, winner)
      );
    }
  }
  for (const changeRequest of input.changeRequests) {
    const winner = pickWinner(changeRequestCandidates(changeRequest, now));
    if (winner) {
      items.push(toBriefItem("change_request", changeRequest.id, project.id, changeRequest.request, changeRequest.status, undefined, winner));
    }
  }

  const attentionItems = prioritizeBriefItems(items, now);

  const blockedItems = attentionItems.filter(
    (i) => (i.sourceType === "work_item" && i.status === "blocked") || (i.sourceType === "dependency" && i.status === "delayed")
  );
  const overdueItems = attentionItems.filter((i) => i.dueDate !== undefined && i.dueDate < now);
  const decisions = attentionItems.filter((i) => i.sourceType === "decision");
  const risks = attentionItems.filter((i) => i.sourceType === "risk");
  const milestones = attentionItems.filter((i) => i.sourceType === "milestone");

  const summary: BriefSummary = {
    blockingCount: attentionItems.filter((i) => i.severity === "blocking").length,
    warningCount: attentionItems.filter((i) => i.severity === "warning").length,
    overdueCount: overdueItems.length,
    decisionsNeedingAttentionCount: decisions.length,
    criticalRisksCount: risks.length,
    milestonesNeedingAttentionCount: milestones.length,
  };

  return {
    projectId: project.id,
    generatedAt: now,
    attentionItems,
    blockedItems,
    overdueItems,
    decisions,
    risks,
    milestones,
    summary,
  };
}
