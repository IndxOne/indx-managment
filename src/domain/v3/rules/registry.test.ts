import { describe, expect, it } from "vitest";
import {
  allRules,
  workItemRules,
  decisionRules,
  riskRules,
  issueRules,
  milestoneRules,
  dependencyRules,
  changeRequestRules,
} from "./registry";

describe("registre de règles", () => {
  it("contient exactement 18 règles (liste définitive de la gate)", () => {
    expect(allRules.length).toBe(18);
  });

  it("chaque tableau de domaine a la taille attendue", () => {
    expect(workItemRules.length).toBe(4);
    expect(decisionRules.length).toBe(3);
    expect(riskRules.length).toBe(3);
    expect(milestoneRules.length).toBe(4);
    expect(dependencyRules.length).toBe(1);
    expect(changeRequestRules.length).toBe(1);
    expect(issueRules.length).toBe(2);
  });

  it("tous les ids sont uniques dans l'ensemble du registre", () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque règle a un targetType cohérent avec son tableau d'appartenance", () => {
    expect(workItemRules.every((r) => r.targetType === "work_item")).toBe(true);
    expect(decisionRules.every((r) => r.targetType === "decision")).toBe(true);
    expect(riskRules.every((r) => r.targetType === "risk")).toBe(true);
    expect(issueRules.every((r) => r.targetType === "issue")).toBe(true);
    expect(milestoneRules.every((r) => r.targetType === "milestone")).toBe(true);
    expect(dependencyRules.every((r) => r.targetType === "dependency")).toBe(true);
    expect(changeRequestRules.every((r) => r.targetType === "change_request")).toBe(true);
  });

  it("liste exacte des ids attendus", () => {
    expect(allRules.map((r) => r.id)).toEqual([
      "ACT-001",
      "ACT-002",
      "ACT-004",
      "ACT-005",
      "DEC-001",
      "DEC-002",
      "DEC-003",
      "RSK-002",
      "RSK-003",
      "RSK-004",
      "ISS-001",
      "ISS-002",
      "JAL-001",
      "JAL-002",
      "JAL-003",
      "JAL-004",
      "DEP-002",
      "CHG-001",
    ]);
  });
});
