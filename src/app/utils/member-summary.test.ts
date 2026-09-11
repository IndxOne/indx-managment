import { describe, expect, it } from "vitest";
import type { Member } from "../../domain/member";
import { assigneesLabel, memberInitials, resolveAssignees } from "./member-summary";

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    workspaceId: "w1",
    displayName: "Koffi",
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("memberInitials", () => {
  it("prend les 2 premières lettres d'un nom simple", () => {
    expect(memberInitials("Koffi")).toBe("KO");
  });

  it("prend l'initiale de chaque mot pour un nom composé", () => {
    expect(memberInitials("Koffi Niamkey")).toBe("KN");
  });

  it("gère un nom vide", () => {
    expect(memberInitials("   ")).toBe("?");
  });
});

describe("resolveAssignees", () => {
  it("résout les membres dans l'ordre des assigneeIds", () => {
    const alice = member({ id: "m2", displayName: "Alice" });
    const koffi = member({ id: "m1", displayName: "Koffi" });
    expect(resolveAssignees([koffi, alice], ["m2", "m1"])).toEqual([alice, koffi]);
  });

  it("inclut un membre désactivé (assignation historique préservée)", () => {
    const inactive = member({ active: false });
    expect(resolveAssignees([inactive], ["m1"])).toEqual([inactive]);
  });

  it("ignore un id sans membre correspondant", () => {
    expect(resolveAssignees([member()], ["m1", "inconnu"])).toEqual([member()]);
  });

  it("tableau vide si aucun assigneeId", () => {
    expect(resolveAssignees([member()], [])).toEqual([]);
  });
});

describe("assigneesLabel", () => {
  it("« Non assigné » si aucun responsable", () => {
    expect(assigneesLabel([member()], [])).toBe("Non assigné");
  });

  it("le nom complet pour un seul responsable", () => {
    expect(assigneesLabel([member()], ["m1"])).toBe("Koffi");
  });

  it("les noms séparés par une virgule pour plusieurs responsables", () => {
    const alice = member({ id: "m2", displayName: "Alice" });
    expect(assigneesLabel([member(), alice], ["m1", "m2"])).toBe("Koffi, Alice");
  });
});
