import { describe, expect, it } from "vitest";
import { briefErrorToUserMessage, BRIEF_FILTERS } from "./brief-labels";

describe("briefErrorToUserMessage", () => {
  it("projet absent/inaccessible -> message dédié", () => {
    expect(briefErrorToUserMessage({ kind: "persistence", code: "not_found", message: "Project x introuvable" })).toBe(
      "Brief indisponible pour ce projet."
    );
  });

  it("toute autre erreur technique -> message générique, jamais le détail brut", () => {
    expect(briefErrorToUserMessage({ kind: "persistence", code: "unknown", message: "duplicate key xyz" })).toBe(
      "Impossible de charger Mon Brief."
    );
    expect(briefErrorToUserMessage({ kind: "authorization", message: "permission denied" })).toBe("Impossible de charger Mon Brief.");
  });
});

describe("BRIEF_FILTERS — mapping exact vers BriefProjection", () => {
  it("chaque filtre sélectionne le tableau correspondant, jamais un recalcul", () => {
    const brief = {
      projectId: "p1",
      generatedAt: "now",
      attentionItems: [{ id: "all" }],
      blockedItems: [{ id: "blocked" }],
      overdueItems: [{ id: "overdue" }],
      decisions: [{ id: "dec" }],
      risks: [{ id: "risk" }],
      milestones: [{ id: "mil" }],
      summary: {
        blockingCount: 0,
        warningCount: 0,
        overdueCount: 0,
        decisionsNeedingAttentionCount: 0,
        criticalRisksCount: 0,
        milestonesNeedingAttentionCount: 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    expect(BRIEF_FILTERS.find((f) => f.id === "all")!.select(brief)).toBe(brief.attentionItems);
    expect(BRIEF_FILTERS.find((f) => f.id === "blocked")!.select(brief)).toBe(brief.blockedItems);
    expect(BRIEF_FILTERS.find((f) => f.id === "overdue")!.select(brief)).toBe(brief.overdueItems);
    expect(BRIEF_FILTERS.find((f) => f.id === "decisions")!.select(brief)).toBe(brief.decisions);
    expect(BRIEF_FILTERS.find((f) => f.id === "risks")!.select(brief)).toBe(brief.risks);
    expect(BRIEF_FILTERS.find((f) => f.id === "milestones")!.select(brief)).toBe(brief.milestones);
  });
});
