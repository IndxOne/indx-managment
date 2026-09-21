import { describe, expect, it } from "vitest";
import type { Project, Objective, WorkItem, Decision, Risk, Issue, Milestone } from "../types";
import { buildProjectOverview, type BuildProjectOverviewInput } from "./build-project-overview";

const NOW = "2026-09-20T08:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";
const FUTURE_LATER = "2027-01-01T00:00:00.000Z";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    workspaceId: "w1",
    name: "Migration M365",
    method: "predictive",
    criticality: "high",
    status: "on_track",
    objectiveIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function emptyInput(overrides: Partial<BuildProjectOverviewInput> = {}): BuildProjectOverviewInput {
  return {
    project: project(),
    now: NOW,
    objectives: [],
    workItems: [],
    decisions: [],
    risks: [],
    issues: [],
    milestones: [],
    ...overrides,
  };
}

function objective(overrides: Partial<Objective> = {}): Objective {
  return {
    id: "o1",
    projectId: "p1",
    statement: "Migrer 100% des boîtes mail",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi1",
    projectId: "p1",
    type: "task",
    title: "Configurer VPN",
    status: "to_scope",
    priority: "normal",
    acceptanceCriteria: [],
    dependencyIds: [],
    evidenceIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function decision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    projectId: "p1",
    question: "Quel fournisseur ERP retenir ?",
    context: "3 devis reçus",
    options: [],
    status: "to_prepare",
    impactedMilestoneIds: [],
    evidenceIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function risk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    projectId: "p1",
    event: "Départ du sponsor",
    status: "qualified",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "i1",
    projectId: "p1",
    problem: "Accès VPN indisponible",
    escalated: false,
    status: "open",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "m1",
    projectId: "p1",
    observableResult: "Design validé",
    targetDate: FUTURE,
    dependencyIds: [],
    acceptanceCriteria: [],
    evidenceIds: [],
    status: "planned",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("buildProjectOverview — sections vides", () => {
  it("retourne des tableaux vides sans exception quand rien n'est fourni", () => {
    const overview = buildProjectOverview(emptyInput());
    expect(overview.objectives).toEqual([]);
    expect(overview.milestones).toEqual([]);
    expect(overview.workItems).toEqual([]);
    expect(overview.decisions).toEqual([]);
    expect(overview.risks).toEqual([]);
    expect(overview.issues).toEqual([]);
    expect(overview.summary.nextMilestone).toBeUndefined();
    expect(overview.focusItem).toBeUndefined();
  });
});

describe("buildProjectOverview — focusItem (UX-5.1)", () => {
  it("expose brief.attentionItems[0] tel quel, sans recalcul", () => {
    const overview = buildProjectOverview(
      emptyInput({ workItems: [workItem({ id: "wBlocked", status: "blocked" })] })
    );
    expect(overview.focusItem?.sourceType).toBe("work_item");
    expect(overview.focusItem?.sourceId).toBe("wBlocked");
    expect(overview.focusItem?.id).toBe("work_item:wBlocked");
  });

  it("undefined quand aucun élément ne demande attention (projet calme)", () => {
    const overview = buildProjectOverview(
      emptyInput({ workItems: [workItem({ status: "ready", responsibleId: "u1", dueDate: FUTURE })] })
    );
    expect(overview.focusItem).toBeUndefined();
  });
});

describe("buildProjectOverview — needsAttention exclusivement dérivé de buildBrief()", () => {
  it("marque needsAttention=true un WorkItem sans responsable (ACT-001) avec la raison du Brief", () => {
    const overview = buildProjectOverview(emptyInput({ workItems: [workItem({ status: "ready" })] }));
    const item = overview.workItems.find((w) => w.id === "wi1")!;
    expect(item.needsAttention).toBe(true);
    expect(item.reason).toBeTruthy();
  });

  it("ne marque pas needsAttention un WorkItem conforme", () => {
    const overview = buildProjectOverview(
      emptyInput({ workItems: [workItem({ status: "ready", responsibleId: "u1", dueDate: FUTURE })] })
    );
    const item = overview.workItems.find((w) => w.id === "wi1")!;
    expect(item.needsAttention).toBe(false);
    expect(item.reason).toBeUndefined();
  });

  it("ne mute jamais les entités sources passées en entrée", () => {
    const wi = workItem({ status: "ready" });
    const snapshot = JSON.parse(JSON.stringify(wi));
    buildProjectOverview(emptyInput({ workItems: [wi] }));
    expect(wi).toEqual(snapshot);
  });
});

describe("buildProjectOverview — summary.highCriticalRisksCount (correctif §1)", () => {
  it("compte high/critical non closed, exclut les critiques closed", () => {
    const overview = buildProjectOverview(
      emptyInput({
        risks: [
          risk({ id: "r1", criticality: "high", status: "qualified" }),
          risk({ id: "r2", criticality: "critical", status: "closed" }),
          risk({ id: "r3", criticality: "low", status: "qualified" }),
        ],
      })
    );
    expect(overview.summary.highCriticalRisksCount).toBe(1);
  });
});

describe("buildProjectOverview — summary.nextMilestone (correctif §2)", () => {
  it("choisit la targetDate la plus proche parmi les milestones non accepted", () => {
    const overview = buildProjectOverview(
      emptyInput({
        milestones: [
          milestone({ id: "m1", targetDate: FUTURE_LATER, status: "planned" }),
          milestone({ id: "m2", targetDate: FUTURE, status: "planned" }),
          milestone({ id: "m3", targetDate: FUTURE, status: "accepted" }),
        ],
      })
    );
    expect(overview.summary.nextMilestone?.id).toBe("m2");
  });

  it("un Milestone refused reste candidat tant qu'il n'est pas accepted", () => {
    const overview = buildProjectOverview(
      emptyInput({ milestones: [milestone({ id: "m1", targetDate: FUTURE, status: "refused" })] })
    );
    expect(overview.summary.nextMilestone?.id).toBe("m1");
  });

  it("tie-break par id lexicographique à date égale", () => {
    const overview = buildProjectOverview(
      emptyInput({
        milestones: [
          milestone({ id: "mZ", targetDate: FUTURE, status: "planned" }),
          milestone({ id: "mA", targetDate: FUTURE, status: "planned" }),
        ],
      })
    );
    expect(overview.summary.nextMilestone?.id).toBe("mA");
  });

  it("undefined si tous les milestones sont accepted", () => {
    const overview = buildProjectOverview(emptyInput({ milestones: [milestone({ status: "accepted" })] }));
    expect(overview.summary.nextMilestone).toBeUndefined();
  });
});

describe("buildProjectOverview — filtre et ordre WorkItems (correctif §3)", () => {
  it("filtre à blocked/in_progress/ready/overdue, exclut les autres statuts", () => {
    const overview = buildProjectOverview(
      emptyInput({
        workItems: [
          workItem({ id: "wA", status: "to_scope" }),
          workItem({ id: "wB", status: "done" }),
          workItem({ id: "wC", status: "ready", responsibleId: "u1", dueDate: FUTURE }),
          workItem({ id: "wD", status: "to_scope", responsibleId: "u1", dueDate: PAST }),
        ],
      })
    );
    const ids = overview.workItems.map((w) => w.id);
    expect(ids).toContain("wC");
    expect(ids).toContain("wD");
    expect(ids).not.toContain("wA");
    expect(ids).not.toContain("wB");
  });

  it("priorise les items needsAttention (ordre du Brief) avant les autres blocked/in_progress/ready", () => {
    const overview = buildProjectOverview(
      emptyInput({
        workItems: [
          workItem({ id: "wReady", status: "ready", responsibleId: "u1", dueDate: FUTURE }),
          workItem({ id: "wBlockedNoReason", status: "blocked" }), // needsAttention (ACT-004 + état blocked)
        ],
      })
    );
    expect(overview.workItems[0]!.id).toBe("wBlockedNoReason");
    expect(overview.workItems[0]!.needsAttention).toBe(true);
  });

  it("à statut équivalent, trie par échéance croissante puis id", () => {
    const overview = buildProjectOverview(
      emptyInput({
        workItems: [
          workItem({ id: "wLate", status: "ready", responsibleId: "u1", dueDate: FUTURE_LATER }),
          workItem({ id: "wEarly", status: "ready", responsibleId: "u1", dueDate: FUTURE }),
          workItem({ id: "wNoDate", status: "ready", responsibleId: "u1", exitCondition: "ok" }),
        ],
      })
    );
    expect(overview.workItems.map((w) => w.id)).toEqual(["wEarly", "wLate", "wNoDate"]);
  });

  it("limite à 8 éléments affichés", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      workItem({ id: `w${i}`, status: "ready", responsibleId: "u1", dueDate: FUTURE })
    );
    const overview = buildProjectOverview(emptyInput({ workItems: many }));
    expect(overview.workItems).toHaveLength(8);
  });
});

describe("buildProjectOverview — Objectifs (aucune identité brute)", () => {
  it("hasOwner=true sans exposer ownerId dans la projection", () => {
    const overview = buildProjectOverview(emptyInput({ objectives: [objective({ ownerId: "u42" })] }));
    const o = overview.objectives[0]!;
    expect(o.hasOwner).toBe(true);
    expect(o).not.toHaveProperty("ownerId");
  });

  it("summary.activeObjectivesCount ne compte que status active", () => {
    const overview = buildProjectOverview(
      emptyInput({
        objectives: [objective({ id: "o1", status: "active" }), objective({ id: "o2", status: "achieved" })],
      })
    );
    expect(overview.summary.activeObjectivesCount).toBe(1);
  });
});

describe("buildProjectOverview — Décisions/Risques/Issues n'exposent aucune identité brute", () => {
  it("Decision expose hasDecider, pas deciderId", () => {
    const overview = buildProjectOverview(emptyInput({ decisions: [decision({ deciderId: "u1" })] }));
    expect(overview.decisions[0]!.hasDecider).toBe(true);
    expect(overview.decisions[0]).not.toHaveProperty("deciderId");
  });

  it("Risk expose hasOwner, pas ownerId", () => {
    const overview = buildProjectOverview(emptyInput({ risks: [risk({ ownerId: "u1" })] }));
    expect(overview.risks[0]!.hasOwner).toBe(true);
    expect(overview.risks[0]).not.toHaveProperty("ownerId");
  });

  it("Issue expose hasResolver, pas resolverId", () => {
    const overview = buildProjectOverview(emptyInput({ issues: [issue({ resolverId: "u1" })] }));
    expect(overview.issues[0]!.hasResolver).toBe(true);
    expect(overview.issues[0]).not.toHaveProperty("resolverId");
  });
});
