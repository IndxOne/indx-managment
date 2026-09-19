import { describe, expect, it } from "vitest";
import type { Issue } from "../types";
import { evaluateIssueRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

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

function resultOf(i: Issue, ruleId: string, now = NOW) {
  return evaluateIssueRules(i, { now }).find((r) => r.ruleId === ruleId);
}

describe("ISS-001 — resolver manquant", () => {
  it("violée sans resolver sur issue ouverte", () => {
    expect(resultOf(issue(), "ISS-001")?.status).toBe("violated");
  });

  it("satisfaite avec resolver", () => {
    expect(resultOf(issue({ resolverId: "user-a" }), "ISS-001")?.status).toBe("satisfied");
  });

  it("non applicable si résolue", () => {
    expect(resultOf(issue({ status: "resolved" }), "ISS-001")?.status).toBe("not_applicable");
  });
});

describe("ISS-002 — échéance dépassée", () => {
  it("non applicable sans targetDate", () => {
    expect(resultOf(issue(), "ISS-002")?.status).toBe("not_applicable");
  });

  it("violée si targetDate dépassée", () => {
    const i = issue({ targetDate: "2026-09-19T00:00:00.000Z" });
    expect(resultOf(i, "ISS-002", NOW)?.status).toBe("violated");
  });

  it("cas limite : targetDate === now n'est pas dépassée", () => {
    const i = issue({ targetDate: NOW });
    expect(resultOf(i, "ISS-002", NOW)?.status).toBe("satisfied");
  });
});

describe("déterminisme, non-mutation, ordre stable", () => {
  it("résultats identiques sur deux appels", () => {
    const i = issue();
    expect(evaluateIssueRules(i, { now: NOW })).toEqual(evaluateIssueRules(i, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const i = issue();
    const snapshot = { ...i };
    evaluateIssueRules(i, { now: NOW });
    expect(i).toEqual(snapshot);
  });

  it("ordre stable", () => {
    expect(evaluateIssueRules(issue(), { now: NOW }).map((r) => r.ruleId)).toEqual(["ISS-001", "ISS-002"]);
  });
});
