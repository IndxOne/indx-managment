import { describe, expect, it } from "vitest";
import type { BriefItem, BriefProjection } from "../brief/types";
import type { Milestone, Project } from "../types";
import { buildProjectsList } from "./build-projects-list";

const NOW = "2026-09-20T08:00:00.000Z";

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

function briefItem(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "work_item:wi1",
    sourceType: "work_item",
    sourceId: "wi1",
    projectId: "p1",
    severity: "blocking",
    title: "Configurer VPN",
    reason: "Aucun responsable assigné",
    status: "to_scope",
    ...overrides,
  };
}

function emptyBrief(overrides: Partial<BriefProjection> = {}): BriefProjection {
  return {
    projectId: "p1",
    generatedAt: NOW,
    attentionItems: [],
    blockedItems: [],
    overdueItems: [],
    decisions: [],
    risks: [],
    milestones: [],
    summary: {
      blockingCount: 0,
      warningCount: 0,
      overdueCount: 0,
      decisionsNeedingAttentionCount: 0,
      criticalRisksCount: 0,
      milestonesNeedingAttentionCount: 0,
    },
    ...overrides,
  };
}

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "m1",
    projectId: "p1",
    observableResult: "VPN configuré",
    targetDate: "2026-10-01T00:00:00.000Z",
    dependencyIds: [],
    acceptanceCriteria: [],
    evidenceIds: [],
    status: "planned",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("buildProjectsList — attentionLevel (ranking de sévérité réutilisé)", () => {
  it("aucun attentionItem -> attentionLevel absent, needsAttention false", () => {
    const projection = buildProjectsList({
      now: NOW,
      projects: [project()],
      briefsByProjectId: new Map([["p1", emptyBrief()]]),
      milestonesByProjectId: new Map(),
    });
    expect(projection.projects[0]!.needsAttention).toBe(false);
    expect(projection.projects[0]!.attentionLevel).toBeUndefined();
  });

  it("un seul warning -> attentionLevel = warning", () => {
    const projection = buildProjectsList({
      now: NOW,
      projects: [project()],
      briefsByProjectId: new Map([["p1", emptyBrief({ attentionItems: [briefItem({ severity: "warning" })] })]]),
      milestonesByProjectId: new Map(),
    });
    expect(projection.projects[0]!.attentionLevel).toBe("warning");
    expect(projection.projects[0]!.needsAttention).toBe(true);
  });

  it("un blocking parmi plusieurs warning -> attentionLevel = blocking (le pire gagne, SEVERITY_RANK réutilisé)", () => {
    const projection = buildProjectsList({
      now: NOW,
      projects: [project()],
      briefsByProjectId: new Map([
        [
          "p1",
          emptyBrief({
            attentionItems: [
              briefItem({ id: "a", severity: "warning" }),
              briefItem({ id: "b", severity: "blocking" }),
              briefItem({ id: "c", severity: "info" }),
            ],
          }),
        ],
      ]),
      milestonesByProjectId: new Map(),
    });
    expect(projection.projects[0]!.attentionLevel).toBe("blocking");
  });
});

describe("buildProjectsList — cartes", () => {
  it("nextMilestone utilise pickNextMilestone (réutilisé, jamais une seconde règle)", () => {
    const sooner = milestone({ id: "m-sooner", targetDate: "2026-10-01T00:00:00.000Z" });
    const later = milestone({ id: "m-later", targetDate: "2026-11-01T00:00:00.000Z" });
    const projection = buildProjectsList({
      now: NOW,
      projects: [project()],
      briefsByProjectId: new Map([["p1", emptyBrief()]]),
      milestonesByProjectId: new Map([["p1", [later, sooner]]]),
    });
    expect(projection.projects[0]!.nextMilestone?.id).toBe("m-sooner");
  });

  it("updatedAt et status/criticality reportés tels quels depuis Project", () => {
    const projection = buildProjectsList({
      now: NOW,
      projects: [project({ status: "at_risk", criticality: "critical", updatedAt: "2026-09-19T00:00:00.000Z" })],
      briefsByProjectId: new Map(),
      milestonesByProjectId: new Map(),
    });
    expect(projection.projects[0]).toMatchObject({ status: "at_risk", criticality: "critical", updatedAt: "2026-09-19T00:00:00.000Z" });
  });

  it("0 projet -> projection vide", () => {
    const projection = buildProjectsList({ now: NOW, projects: [], briefsByProjectId: new Map(), milestonesByProjectId: new Map() });
    expect(projection).toEqual({ generatedAt: NOW, projects: [] });
  });

  it("aucun recalcul de brief : un projet sans entrée dans briefsByProjectId n'échoue pas, needsAttention=false", () => {
    const projection = buildProjectsList({
      now: NOW,
      projects: [project()],
      briefsByProjectId: new Map(),
      milestonesByProjectId: new Map(),
    });
    expect(projection.projects[0]!.needsAttention).toBe(false);
  });
});
