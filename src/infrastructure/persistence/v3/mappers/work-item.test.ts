import { describe, expect, it } from "vitest";
import type { WorkItem } from "../../../../domain/v3/types";
import { workItemFromRow, workItemToRow } from "./work-item";

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
    createdAt: "2026-09-20T08:00:00.000Z",
    updatedAt: "2026-09-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("workItemToRow / workItemFromRow", () => {
  it("round-trip sans perte", () => {
    const original = workItem({
      responsibleId: "user-a",
      status: "blocked",
      dueDate: "2026-10-01T00:00:00.000Z",
      exitCondition: "Tests validés",
      expectedResult: "VPN opérationnel",
      acceptanceCriteria: [{ description: "Connexion stable", satisfied: false }],
      milestoneId: "m1",
      blockedReason: "attente accès",
      blockedNextStep: "relancer le prestataire",
    });
    const row = workItemToRow(original, "w1");
    expect(workItemFromRow(row, [], [])).toEqual(original);
  });

  it("dependencyIds/evidenceIds reconstruits en paramètre, pas en colonne", () => {
    const row = workItemToRow(workItem(), "w1");
    expect(row).not.toHaveProperty("dependency_ids");
    expect(row).not.toHaveProperty("evidence_ids");
    expect(workItemFromRow(row, ["dep1", "dep2"], ["ev1"]).dependencyIds).toEqual(["dep1", "dep2"]);
  });
});
