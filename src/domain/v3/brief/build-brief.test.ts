import { describe, expect, it } from "vitest";
import type { Project, WorkItem, Decision, Risk, Issue, Milestone, Dependency, ChangeRequest } from "../types";
import { buildBrief, type BuildBriefInput } from "./build-brief";

const NOW = "2026-09-20T08:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";

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

function emptyInput(overrides: Partial<BuildBriefInput> = {}): BuildBriefInput {
  return {
    project: project(),
    now: NOW,
    workItems: [],
    decisions: [],
    risks: [],
    issues: [],
    milestones: [],
    dependencies: [],
    changeRequests: [],
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

function dependency(overrides: Partial<Dependency> = {}): Dependency {
  return {
    id: "dep1",
    projectId: "p1",
    sourceEntityId: "wi1",
    dependentEntityId: "wi2",
    type: "blocks",
    responsibleId: "user-a",
    status: "pending",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function changeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: "cr1",
    projectId: "p1",
    request: "Ajouter un module reporting",
    origin: "client",
    impact: {},
    options: [],
    status: "submitted",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("buildBrief — Brief vide", () => {
  it("aucune entité pertinente => toutes les listes vides et summary à zéro", () => {
    const brief = buildBrief(emptyInput());
    expect(brief.attentionItems).toEqual([]);
    expect(brief.blockedItems).toEqual([]);
    expect(brief.overdueItems).toEqual([]);
    expect(brief.decisions).toEqual([]);
    expect(brief.risks).toEqual([]);
    expect(brief.milestones).toEqual([]);
    expect(brief.summary).toEqual({
      blockingCount: 0,
      warningCount: 0,
      overdueCount: 0,
      decisionsNeedingAttentionCount: 0,
      criticalRisksCount: 0,
      milestonesNeedingAttentionCount: 0,
    });
  });

  it("aucune entité qui ne matche aucune règle/état => exclue du Brief", () => {
    const brief = buildBrief(
      emptyInput({
        workItems: [workItem({ status: "in_progress", responsibleId: "user-a", dueDate: FUTURE })],
        decisions: [decision({ status: "ready", deciderId: "user-a", dueDate: FUTURE })],
      })
    );
    expect(brief.attentionItems).toEqual([]);
  });
});

describe("WorkItem blocked — inclusion d'état indépendante d'ACT-004", () => {
  it("bloqué AVEC motif, responsable et échéance : candidat warning malgré ACT-001/002/004 satisfaites", () => {
    const brief = buildBrief(
      emptyInput({
        workItems: [workItem({ status: "blocked", blockedReason: "attente accès", responsibleId: "user-a", dueDate: FUTURE })],
      })
    );
    expect(brief.attentionItems).toHaveLength(1);
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "work_item", severity: "warning", ruleId: undefined });
    expect(brief.attentionItems[0]!.reason).toContain("attente accès");
  });

  it("bloqué SANS motif (mais responsable/échéance présents) : ACT-004 (blocking) l'emporte sur l'état blocked (warning)", () => {
    const brief = buildBrief(emptyInput({ workItems: [workItem({ status: "blocked", responsibleId: "user-a", dueDate: FUTURE })] }));
    expect(brief.attentionItems).toHaveLength(1);
    expect(brief.attentionItems[0]).toMatchObject({ severity: "blocking", ruleId: "ACT-004" });
  });

  it("figure dans blockedItems", () => {
    const brief = buildBrief(
      emptyInput({ workItems: [workItem({ status: "blocked", blockedReason: "x", responsibleId: "user-a", dueDate: FUTURE })] })
    );
    expect(brief.blockedItems.map((i) => i.sourceId)).toEqual(["wi1"]);
  });
});

describe("Issue — escalated vs open/in_progress", () => {
  it("escalated sans violation ISS-* : candidat warning inclus", () => {
    const brief = buildBrief(emptyInput({ issues: [issue({ status: "escalated", resolverId: "user-a" })] }));
    expect(brief.attentionItems).toHaveLength(1);
    expect(brief.attentionItems[0]).toMatchObject({ severity: "warning", ruleId: undefined, reason: "Issue escalée." });
  });

  it("open sans violation ISS-* : exclue du Brief", () => {
    const brief = buildBrief(emptyInput({ issues: [issue({ status: "open", resolverId: "user-a" })] }));
    expect(brief.attentionItems).toEqual([]);
  });

  it("in_progress sans violation ISS-* : exclue du Brief", () => {
    const brief = buildBrief(emptyInput({ issues: [issue({ status: "in_progress", resolverId: "user-a" })] }));
    expect(brief.attentionItems).toEqual([]);
  });

  it("open avec ISS-001 violée (resolver manquant) : incluse via la règle", () => {
    const brief = buildBrief(emptyInput({ issues: [issue({ status: "open" })] }));
    expect(brief.attentionItems).toHaveLength(1);
    expect(brief.attentionItems[0]).toMatchObject({ ruleId: "ISS-001" });
  });

  it("escalated ET ISS-001 violée : la raison de la règle l'emporte sur le générique 'escalée'", () => {
    const brief = buildBrief(emptyInput({ issues: [issue({ status: "escalated" })] }));
    expect(brief.attentionItems[0]).toMatchObject({ ruleId: "ISS-001" });
  });
});

describe("règle violée correctement transformée en BriefItem (par domaine)", () => {
  it("Decision — DEC-001 violée", () => {
    const brief = buildBrief(emptyInput({ decisions: [decision()] }));
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "decision", severity: "blocking", ruleId: "DEC-001" });
  });

  it("Risk — RSK-002 violée", () => {
    const brief = buildBrief(emptyInput({ risks: [risk({ criticality: "high" })] }));
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "risk", severity: "blocking", ruleId: "RSK-002" });
  });

  it("Milestone — JAL-004 (refused)", () => {
    const brief = buildBrief(emptyInput({ milestones: [milestone({ status: "refused" })] }));
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "milestone", severity: "warning", ruleId: "JAL-004" });
  });

  it("Dependency — DEP-002 (delayed)", () => {
    const brief = buildBrief(emptyInput({ dependencies: [dependency({ status: "delayed" })] }));
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "dependency", severity: "warning", ruleId: "DEP-002" });
  });

  it("ChangeRequest — CHG-001 violée", () => {
    const brief = buildBrief(emptyInput({ changeRequests: [changeRequest()] }));
    expect(brief.attentionItems[0]).toMatchObject({ sourceType: "change_request", severity: "blocking", ruleId: "CHG-001" });
  });
});

describe("blockedItems — périmètre strict (décision de gate §3)", () => {
  it("un Milestone refused ne figure PAS dans blockedItems (seulement WorkItem/Dependency)", () => {
    const brief = buildBrief(
      emptyInput({
        milestones: [milestone({ status: "refused" })],
        workItems: [workItem({ status: "blocked", blockedReason: "x" })],
        dependencies: [dependency({ status: "delayed" })],
      })
    );
    expect(brief.blockedItems.map((i) => i.sourceType).sort()).toEqual(["dependency", "work_item"]);
    // Le jalon refused reste bien présent ailleurs.
    expect(brief.attentionItems.some((i) => i.sourceType === "milestone")).toBe(true);
    expect(brief.milestones).toHaveLength(1);
  });
});

describe("overdue avant échéance future (même sévérité)", () => {
  it("même règle (DEP-002, warning) : l'échéance passée précède l'échéance future", () => {
    const brief = buildBrief(
      emptyInput({
        dependencies: [
          dependency({ id: "dep-future", status: "delayed", neededByDate: FUTURE }),
          dependency({ id: "dep-late", status: "delayed", neededByDate: PAST }),
        ],
      })
    );
    expect(brief.attentionItems.map((i) => i.sourceId)).toEqual(["dep-late", "dep-future"]);
    expect(brief.overdueItems.map((i) => i.sourceId)).toEqual(["dep-late"]);
  });

  it("ACT-005 exclut un WorkItem non en retard, inclut celui qui l'est", () => {
    const brief = buildBrief(
      emptyInput({
        workItems: [
          workItem({ id: "wi-future", status: "in_progress", responsibleId: "user-a", dueDate: FUTURE }),
          workItem({ id: "wi-late", status: "in_progress", responsibleId: "user-a", dueDate: PAST }),
        ],
      })
    );
    expect(brief.attentionItems.map((i) => i.sourceId)).toEqual(["wi-late"]);
    expect(brief.overdueItems.map((i) => i.sourceId)).toEqual(["wi-late"]);
  });
});

describe("blocking avant warning", () => {
  it("un item blocking précède un item warning dans attentionItems", () => {
    const brief = buildBrief(
      emptyInput({
        decisions: [decision()], // DEC-001, blocking
        dependencies: [dependency({ status: "delayed" })], // DEP-002, warning
      })
    );
    expect(brief.attentionItems.map((i) => i.severity)).toEqual(["blocking", "warning"]);
  });
});

describe("aucune duplication d'un même problème", () => {
  it("un WorkItem violant ACT-001 ET ACT-002 ne produit qu'un seul BriefItem", () => {
    const brief = buildBrief(emptyInput({ workItems: [workItem({ status: "to_scope" })] }));
    expect(brief.attentionItems).toHaveLength(1);
    expect(brief.attentionItems[0]).toMatchObject({ ruleId: "ACT-001" }); // premier de l'ordre déclaré, même sévérité blocking
  });
});

describe("plusieurs entités d'un même projet", () => {
  it("toutes les entités pertinentes de tous les domaines apparaissent", () => {
    const brief = buildBrief(
      emptyInput({
        workItems: [workItem({ status: "to_scope" })],
        decisions: [decision()],
        risks: [risk({ criticality: "critical" })],
        issues: [issue({ status: "escalated" })],
        milestones: [milestone({ status: "refused" })],
        dependencies: [dependency({ status: "delayed" })],
        changeRequests: [changeRequest()],
      })
    );
    expect(brief.attentionItems).toHaveLength(7);
    expect(new Set(brief.attentionItems.map((i) => i.sourceType)).size).toBe(7);
  });
});

describe("séparation stricte entre projets", () => {
  it("buildBrief ne reçoit que les entités du projet demandé — aucune fuite possible structurellement", () => {
    const briefA = buildBrief(
      emptyInput({ project: project({ id: "pA" }), workItems: [workItem({ id: "wiA", projectId: "pA", status: "to_scope" })] })
    );
    expect(briefA.projectId).toBe("pA");
    expect(briefA.attentionItems.every((i) => i.projectId === "pA")).toBe(true);
    // Aucune entité du "projet B" n'a jamais été passée en entrée : rien à filtrer, rien ne peut fuiter.
  });
});

describe("déterminisme et non-mutation", () => {
  it("deux appels identiques produisent le même résultat", () => {
    const input = emptyInput({ workItems: [workItem({ status: "blocked", blockedReason: "x" })], decisions: [decision()] });
    expect(buildBrief(input)).toEqual(buildBrief(input));
  });

  it("ne mute jamais les entités sources", () => {
    const item = workItem({ status: "blocked", blockedReason: "x" });
    const dec = decision();
    const snapshotItem = { ...item };
    const snapshotDec = { ...dec };
    buildBrief(emptyInput({ workItems: [item], decisions: [dec] }));
    expect(item).toEqual(snapshotItem);
    expect(dec).toEqual(snapshotDec);
  });
});

describe("summary.decisionsNeedingAttentionCount — dérivé, pas de second parcours", () => {
  it("correspond exactement à decisions.length", () => {
    const brief = buildBrief(emptyInput({ decisions: [decision(), decision({ id: "d2", deciderId: "user-a" })] }));
    expect(brief.summary.decisionsNeedingAttentionCount).toBe(brief.decisions.length);
  });
});
