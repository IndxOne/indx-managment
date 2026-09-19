import { describe, expect, it } from "vitest";
import { escalateIssue, resolveIssue } from "./issue";
import type { Issue } from "../types";

const NOW = "2026-09-20T08:00:00.000Z";

function baseIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "iss1",
    projectId: "p1",
    problem: "Le prestataire a cessé son activité",
    escalated: false,
    status: "open",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("resolveIssue", () => {
  it("refuse sans responsable de résolution", () => {
    const result = resolveIssue(baseIssue({ status: "in_progress" }), "", "Contrat résilié", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("issue_missing_resolver");
  });

  it("accepte avec responsable et émet issue.resolved", () => {
    const result = resolveIssue(baseIssue({ status: "in_progress" }), "user-a", "Contrat résilié, nouveau prestataire choisi", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("resolved");
    expect(result.state.resolvedAt).toBe(NOW);
    expect(result.events).toEqual([{ type: "issue.resolved", occurredAt: NOW, projectId: "p1", payload: { issueId: "iss1" } }]);
  });

  it("refuse de résoudre une issue déjà résolue", () => {
    const result = resolveIssue(baseIssue({ status: "resolved" }), "user-a", "x", NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("issue_invalid_transition");
  });
});

describe("escalateIssue", () => {
  it("escalade depuis open ou in_progress", () => {
    expect(escalateIssue(baseIssue({ status: "open" }), NOW).ok).toBe(true);
    expect(escalateIssue(baseIssue({ status: "in_progress" }), NOW).ok).toBe(true);
  });

  it("refuse d'escalader une issue résolue", () => {
    expect(escalateIssue(baseIssue({ status: "resolved" }), NOW).ok).toBe(false);
  });
});
