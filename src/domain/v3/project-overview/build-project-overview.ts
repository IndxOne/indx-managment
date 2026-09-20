import type { Decision, Issue, Milestone, Project, Risk, WorkItem, Objective } from "../types";
import { buildBrief } from "../brief/build-brief";
import type { BriefItem, BriefSourceType } from "../brief/types";
import type {
  DecisionOverviewItem,
  IssueOverviewItem,
  MilestoneOverviewItem,
  ObjectiveOverviewItem,
  ProjectOverviewProjection,
  ProjectOverviewSummary,
  RiskOverviewItem,
  WorkItemOverviewItem,
} from "./types";

export interface BuildProjectOverviewInput {
  project: Project;
  now: string;
  objectives: Objective[];
  workItems: WorkItem[];
  decisions: Decision[];
  risks: Risk[];
  issues: Issue[];
  milestones: Milestone[];
}

const WORK_ITEM_DISPLAY_STATUSES = new Set(["blocked", "in_progress", "ready"]);
const WORK_ITEM_STATUS_RANK: Record<string, number> = { blocked: 0, in_progress: 1, ready: 2 };
const WORK_ITEM_DISPLAY_LIMIT = 8;

/** Index attentionItems par `${sourceType}:${sourceId}` (même format que
 * BriefItem.id) — seule source de needsAttention/reason (§3/§6 de la gate,
 * jamais un recalcul de règle ici). */
function indexAttention(attentionItems: BriefItem[]): Map<string, BriefItem> {
  const byKey = new Map<string, BriefItem>();
  for (const item of attentionItems) byKey.set(item.id, item);
  return byKey;
}

function attentionOf(byKey: Map<string, BriefItem>, sourceType: BriefSourceType, sourceId: string): { needsAttention: boolean; reason?: string } {
  const item = byKey.get(`${sourceType}:${sourceId}`);
  return item ? { needsAttention: true, reason: item.reason } : { needsAttention: false };
}

/**
 * Ordre WorkItems (§3 du correctif de gate) : décision de PRÉSENTATION, pas
 * une règle métier — aucune règle Lot 2 réévaluée ici.
 * 1. présents dans Mon Brief (needsAttention), ordre du Brief conservé ;
 * 2. autres blocked ; 3. autres in_progress ; 4. autres ready ;
 * 5. à statut équivalent, échéance croissante ; 6. sans échéance en dernier ;
 * 7. tie-break id.
 */
function orderWorkItems(items: WorkItemOverviewItem[], briefOrder: Map<string, number>): WorkItemOverviewItem[] {
  return [...items].sort((a, b) => {
    const aInBrief = briefOrder.has(a.id);
    const bInBrief = briefOrder.has(b.id);
    if (aInBrief !== bInBrief) return aInBrief ? -1 : 1;
    if (aInBrief && bInBrief) return briefOrder.get(a.id)! - briefOrder.get(b.id)!;

    const statusDiff = (WORK_ITEM_STATUS_RANK[a.status] ?? 3) - (WORK_ITEM_STATUS_RANK[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** nextMilestone (§2 du correctif de gate) : projection de présentation,
 * aucune règle métier. Candidats status !== "accepted" avec targetDate ;
 * tri targetDate croissante puis id lexicographique. */
function pickNextMilestone(milestones: Milestone[]): ProjectOverviewSummary["nextMilestone"] {
  const candidates = milestones.filter((m) => m.status !== "accepted" && m.targetDate);
  if (candidates.length === 0) return undefined;
  const sorted = [...candidates].sort((a, b) => {
    if (a.targetDate !== b.targetDate) return a.targetDate < b.targetDate ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const winner = sorted[0]!;
  return { id: winner.id, observableResult: winner.observableResult, targetDate: winner.targetDate };
}

/** Construit la projection Projet V3. Jamais d'accès repository ici :
 * l'appelant charge et fournit toutes les collections (gate §4). */
export function buildProjectOverview(input: BuildProjectOverviewInput): ProjectOverviewProjection {
  const { project, now } = input;

  const brief = buildBrief({
    project,
    now,
    workItems: input.workItems,
    decisions: input.decisions,
    risks: input.risks,
    issues: input.issues,
    milestones: input.milestones,
    dependencies: [],
    changeRequests: [],
  });
  const attentionByKey = indexAttention(brief.attentionItems);

  const objectives: ObjectiveOverviewItem[] = input.objectives.map((o) => ({
    id: o.id,
    statement: o.statement,
    expectedValue: o.expectedValue,
    status: o.status,
    hasOwner: o.ownerId !== undefined,
  }));

  const milestones: MilestoneOverviewItem[] = input.milestones.map((m) => {
    const attention = attentionOf(attentionByKey, "milestone", m.id);
    return {
      id: m.id,
      observableResult: m.observableResult,
      status: m.status,
      targetDate: m.targetDate,
      ...attention,
    };
  });

  const briefWorkItemOrder = new Map<string, number>();
  brief.attentionItems.forEach((item, index) => {
    if (item.sourceType === "work_item") briefWorkItemOrder.set(item.sourceId, index);
  });

  const overdueOrDisplayStatus = (item: WorkItem) =>
    WORK_ITEM_DISPLAY_STATUSES.has(item.status) || (item.dueDate !== undefined && item.dueDate < now);

  const allWorkItems: WorkItemOverviewItem[] = input.workItems.filter(overdueOrDisplayStatus).map((w) => {
    const attention = attentionOf(attentionByKey, "work_item", w.id);
    return {
      id: w.id,
      title: w.title,
      status: w.status,
      priority: w.priority,
      dueDate: w.dueDate,
      ...attention,
    };
  });
  const workItems = orderWorkItems(allWorkItems, briefWorkItemOrder).slice(0, WORK_ITEM_DISPLAY_LIMIT);

  const decisions: DecisionOverviewItem[] = input.decisions.map((d) => {
    const attention = attentionOf(attentionByKey, "decision", d.id);
    return {
      id: d.id,
      question: d.question,
      status: d.status,
      dueDate: d.dueDate,
      hasDecider: d.deciderId !== undefined,
      ...attention,
    };
  });

  const risks: RiskOverviewItem[] = input.risks.map((r) => {
    const attention = attentionOf(attentionByKey, "risk", r.id);
    return {
      id: r.id,
      event: r.event,
      criticality: r.criticality,
      status: r.status,
      hasOwner: r.ownerId !== undefined,
      ...attention,
    };
  });

  const issues: IssueOverviewItem[] = input.issues.map((i) => {
    const attention = attentionOf(attentionByKey, "issue", i.id);
    return {
      id: i.id,
      problem: i.problem,
      status: i.status,
      targetDate: i.targetDate,
      hasResolver: i.resolverId !== undefined,
      ...attention,
    };
  });

  const summary: ProjectOverviewSummary = {
    activeObjectivesCount: input.objectives.filter((o) => o.status === "active").length,
    openWorkItemsCount: input.workItems.filter((w) => w.status !== "done" && w.status !== "cancelled").length,
    highCriticalRisksCount: input.risks.filter((r) => (r.criticality === "high" || r.criticality === "critical") && r.status !== "closed").length,
    pendingDecisionsCount: input.decisions.filter((d) => d.status === "to_prepare" || d.status === "ready").length,
    openIssuesCount: input.issues.filter((i) => i.status === "open" || i.status === "in_progress" || i.status === "escalated").length,
    nextMilestone: pickNextMilestone(input.milestones),
  };

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      method: project.method,
      criticality: project.criticality,
      sponsor: project.sponsor,
      projectManager: project.projectManager,
      targetDate: project.targetDate,
      forecastDate: project.forecastDate,
    },
    objectives,
    milestones,
    workItems,
    decisions,
    risks,
    issues,
    summary,
  };
}
