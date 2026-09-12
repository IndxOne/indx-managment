import { describe, expect, it } from "vitest";
import { createMember, renameMember, setMemberActive, type Member } from "./member";

function baseMember(overrides: Partial<Member> = {}): Member {
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

describe("createMember", () => {
  it("crée un membre actif avec le nom fourni", () => {
    const member = createMember({ id: "m1", workspaceId: "w1", displayName: "Koffi", now: "2026-09-01T00:00:00.000Z" });
    expect(member).toEqual({
      id: "m1",
      workspaceId: "w1",
      displayName: "Koffi",
      email: undefined,
      avatarUrl: undefined,
      active: true,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("rejette un nom vide", () => {
    expect(() => createMember({ id: "m1", workspaceId: "w1", displayName: "   " })).toThrow(
      "Le nom du membre est requis"
    );
  });

  it("normalise un email vide en absent", () => {
    const member = createMember({ id: "m1", workspaceId: "w1", displayName: "Koffi", email: "  " });
    expect(member.email).toBeUndefined();
  });
});

describe("renameMember", () => {
  it("change le nom et met à jour updatedAt", () => {
    const renamed = renameMember(baseMember(), "Alice", "2026-09-02T00:00:00.000Z");
    expect(renamed.displayName).toBe("Alice");
    expect(renamed.updatedAt).toBe("2026-09-02T00:00:00.000Z");
  });

  it("no-op si le nom est identique (pas de updatedAt inutile)", () => {
    const member = baseMember();
    expect(renameMember(member, "Koffi", "2026-09-02T00:00:00.000Z")).toBe(member);
  });

  it("rejette un nom vide", () => {
    expect(() => renameMember(baseMember(), "   ")).toThrow("Le nom du membre est requis");
  });
});

describe("setMemberActive", () => {
  it("désactive un membre", () => {
    const deactivated = setMemberActive(baseMember(), false, "2026-09-02T00:00:00.000Z");
    expect(deactivated.active).toBe(false);
    expect(deactivated.updatedAt).toBe("2026-09-02T00:00:00.000Z");
  });

  it("réactive un membre désactivé", () => {
    const reactivated = setMemberActive(baseMember({ active: false }), true, "2026-09-02T00:00:00.000Z");
    expect(reactivated.active).toBe(true);
  });

  it("no-op si l'état est déjà celui demandé", () => {
    const member = baseMember();
    expect(setMemberActive(member, true)).toBe(member);
  });
});
