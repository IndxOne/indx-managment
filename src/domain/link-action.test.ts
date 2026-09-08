import { describe, expect, it } from "vitest";
import { linkAction, unlinkAction } from "./link-action";
import type { Action } from "./types";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Configurer VPN",
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("linkAction", () => {
  it("pose le lien et met à jour updatedAt", () => {
    const linked = linkAction(action(), "a2", "2026-09-08T00:00:00.000Z");
    expect(linked.linkedActionId).toBe("a2");
    expect(linked.updatedAt).toBe("2026-09-08T00:00:00.000Z");
  });

  it("rejette un lien vers soi-même", () => {
    expect(() => linkAction(action(), "a1")).toThrow();
  });

  it("remplace un lien existant", () => {
    const first = linkAction(action(), "a2");
    const second = linkAction(first, "a3");
    expect(second.linkedActionId).toBe("a3");
  });

  it("ne modifie jamais schedule, phase ou statut", () => {
    const original = action({ status: "doing", phaseId: "ateliers" });
    const linked = linkAction(original, "a2");
    expect(linked.status).toBe(original.status);
    expect(linked.phaseId).toBe(original.phaseId);
  });
});

describe("unlinkAction", () => {
  it("efface le lien", () => {
    const linked = linkAction(action(), "a2");
    const unlinked = unlinkAction(linked, "2026-09-09T00:00:00.000Z");
    expect(unlinked.linkedActionId).toBeUndefined();
    expect(unlinked.updatedAt).toBe("2026-09-09T00:00:00.000Z");
  });

  it("ne fait rien de spécial si déjà délié", () => {
    const unlinked = unlinkAction(action());
    expect(unlinked.linkedActionId).toBeUndefined();
  });
});
