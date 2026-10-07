import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";
import { ProjectHomeSummary } from "./ProjectHomeSummary";

function overview(overrides: Partial<ProjectOverviewProjection> = {}): ProjectOverviewProjection {
  return {
    project: {
      id: "p1",
      name: "Migration ERP",
      status: "on_track",
      method: "predictive",
      criticality: "high",
    },
    objectives: [],
    milestones: [],
    workItems: [],
    decisions: [],
    risks: [],
    issues: [],
    summary: {
      activeObjectivesCount: 1,
      openWorkItemsCount: 12,
      highCriticalRisksCount: 1,
      pendingDecisionsCount: 2,
      openIssuesCount: 3,
      nextMilestone: {
        id: "m1",
        observableResult: "Recette",
        targetDate: "2026-10-18T00:00:00.000Z",
      },
    },
    watchItems: [],
    recentChanges: [],
    ...overrides,
  };
}

describe("ProjectHomeSummary", () => {
  it("affiche les informations de pilotage dérivées de la projection existante", () => {
    render(<ProjectHomeSummary overview={overview()} />);

    expect(screen.getByLabelText("État du projet")).toBeInTheDocument();
    expect(screen.getByText("Actions ouvertes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("à surveiller")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("décisions")).toBeInTheDocument();
    expect(screen.getByText("Recette")).toBeInTheDocument();
    expect(screen.getByText(/18 oct/i)).toBeInTheDocument();
  });

  it("reste compact quand aucun jalon n'est planifié", () => {
    const data = overview({
      summary: {
        activeObjectivesCount: 0,
        openWorkItemsCount: 0,
        highCriticalRisksCount: 0,
        pendingDecisionsCount: 0,
        openIssuesCount: 0,
      },
    });

    render(<ProjectHomeSummary overview={data} />);

    expect(screen.queryByText("Prochain jalon")).not.toBeInTheDocument();
  });
});
