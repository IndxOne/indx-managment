import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BriefSummary } from "./BriefSummary";

describe("BriefSummary", () => {
  it("affiche directement les 6 compteurs fournis, sans recalcul", () => {
    render(
      <BriefSummary
        summary={{
          blockingCount: 3,
          warningCount: 2,
          overdueCount: 1,
          decisionsNeedingAttentionCount: 4,
          criticalRisksCount: 5,
          milestonesNeedingAttentionCount: 6,
        }}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
