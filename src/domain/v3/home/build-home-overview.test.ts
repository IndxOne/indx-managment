import { describe, expect, it } from "vitest";
import type { BriefItem, BriefProjection } from "../brief/types";
import type { Milestone, Project } from "../types";
import { buildHomeOverview } from "./build-home-overview";

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

describe("buildHomeOverview — attention globale", () => {
  it("fusionne les attentionItems de tous les projets chargés, sans en réévaluer la sévérité", () => {
    const p1 = project({ id: "p1" });
    const p2 = project({ id: "p2", name: "AMOA RH" });
    const item1 = briefItem({ id: "work_item:wi1", sourceId: "wi1", projectId: "p1", severity: "warning" });
    const item2 = briefItem({ id: "risk:r1", sourceType: "risk", sourceId: "r1", projectId: "p2", severity: "blocking" });

    const overview = buildHomeOverview({
      now: NOW,
      projects: [p1, p2],
      briefsByProjectId: new Map([
        ["p1", emptyBrief({ projectId: "p1", attentionItems: [item1] })],
        ["p2", emptyBrief({ projectId: "p2", attentionItems: [item2] })],
      ]),
      milestonesByProjectId: new Map(),
    });

    // blocking (item2) passe avant warning (item1) — c'est prioritizeBriefItems
    // qui décide, jamais un recalcul ici.
    expect(overview.attentionItems.map((i) => i.id)).toEqual(["risk:r1", "work_item:wi1"]);
  });

  it("tronque au top 3, jamais plus", () => {
    const p1 = project({ id: "p1" });
    const items = Array.from({ length: 5 }, (_, i) =>
      briefItem({ id: `work_item:wi${i}`, sourceId: `wi${i}`, projectId: "p1" })
    );

    const overview = buildHomeOverview({
      now: NOW,
      projects: [p1],
      briefsByProjectId: new Map([["p1", emptyBrief({ projectId: "p1", attentionItems: items })]]),
      milestonesByProjectId: new Map(),
    });

    expect(overview.attentionItems).toHaveLength(3);
  });

  it("aucune projection HomeOverviewProjection ne porte de compteur global partiel (pas de champ count)", () => {
    const overview = buildHomeOverview({
      now: NOW,
      projects: [],
      briefsByProjectId: new Map(),
      milestonesByProjectId: new Map(),
    });
    expect(overview).not.toHaveProperty("briefItemCount");
    expect(overview).toEqual({ generatedAt: NOW, attentionItems: [], projects: [] });
  });
});

describe("buildHomeOverview — cartes projet", () => {
  it("needsAttention reflète exactement la présence d'attentionItems du Brief du projet", () => {
    const p1 = project({ id: "p1" });
    const p2 = project({ id: "p2", name: "Sans signal" });

    const overview = buildHomeOverview({
      now: NOW,
      projects: [p1, p2],
      briefsByProjectId: new Map([
        ["p1", emptyBrief({ projectId: "p1", attentionItems: [briefItem()] })],
        ["p2", emptyBrief({ projectId: "p2" })],
      ]),
      milestonesByProjectId: new Map(),
    });

    expect(overview.projects.find((p) => p.id === "p1")?.needsAttention).toBe(true);
    expect(overview.projects.find((p) => p.id === "p2")?.needsAttention).toBe(false);
  });

  it("nextMilestone utilise exactement pickNextMilestone (jamais accepted, targetDate croissante)", () => {
    const p1 = project({ id: "p1" });
    const accepted = milestone({ id: "m-accepted", status: "accepted", targetDate: "2026-09-25T00:00:00.000Z" });
    const sooner = milestone({ id: "m-sooner", targetDate: "2026-10-01T00:00:00.000Z" });
    const later = milestone({ id: "m-later", targetDate: "2026-11-01T00:00:00.000Z" });

    const overview = buildHomeOverview({
      now: NOW,
      projects: [p1],
      briefsByProjectId: new Map([["p1", emptyBrief({ projectId: "p1" })]]),
      milestonesByProjectId: new Map([["p1", [later, accepted, sooner]]]),
    });

    expect(overview.projects[0]?.nextMilestone?.id).toBe("m-sooner");
  });

  it("aucun jalon disponible -> nextMilestone absent, pas d'erreur", () => {
    const p1 = project({ id: "p1" });
    const overview = buildHomeOverview({
      now: NOW,
      projects: [p1],
      briefsByProjectId: new Map([["p1", emptyBrief({ projectId: "p1" })]]),
      milestonesByProjectId: new Map(),
    });
    expect(overview.projects[0]?.nextMilestone).toBeUndefined();
  });

  it("0 projet -> projection vide, jamais une erreur", () => {
    const overview = buildHomeOverview({
      now: NOW,
      projects: [],
      briefsByProjectId: new Map(),
      milestonesByProjectId: new Map(),
    });
    expect(overview.projects).toEqual([]);
    expect(overview.attentionItems).toEqual([]);
  });
});
