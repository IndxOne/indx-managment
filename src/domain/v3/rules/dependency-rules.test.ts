import { describe, expect, it } from "vitest";
import type { Dependency } from "../types";
import { evaluateDependencyRules } from "./evaluate";

const NOW = "2026-09-20T08:00:00.000Z";

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

describe("DEP-002 — dépendance en retard", () => {
  it("non applicable si pas delayed", () => {
    expect(evaluateDependencyRules(dependency({ status: "pending" }), { now: NOW }).map((r) => r.status)).toEqual(["not_applicable"]);
  });

  it("violée si delayed", () => {
    expect(evaluateDependencyRules(dependency({ status: "delayed" }), { now: NOW }).map((r) => r.status)).toEqual(["violated"]);
  });
});

describe("déterminisme, non-mutation, ordre stable", () => {
  it("résultats identiques sur deux appels", () => {
    const d = dependency({ status: "delayed" });
    expect(evaluateDependencyRules(d, { now: NOW })).toEqual(evaluateDependencyRules(d, { now: NOW }));
  });

  it("ne mute jamais la cible", () => {
    const d = dependency({ status: "delayed" });
    const snapshot = { ...d };
    evaluateDependencyRules(d, { now: NOW });
    expect(d).toEqual(snapshot);
  });

  it("registre à une seule règle (DEP-001 volontairement écartée — cf. gate)", () => {
    expect(evaluateDependencyRules(dependency(), { now: NOW }).map((r) => r.ruleId)).toEqual(["DEP-002"]);
  });
});
