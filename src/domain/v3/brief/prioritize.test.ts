import { describe, expect, it } from "vitest";
import type { BriefItem } from "./types";
import { prioritizeBriefItems } from "./prioritize";

const NOW = "2026-09-20T08:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";
const EARLIER_PAST = "2026-08-01T00:00:00.000Z";
const FUTURE = "2026-12-01T00:00:00.000Z";
const LATER_FUTURE = "2027-01-01T00:00:00.000Z";

function item(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "work_item:wi1",
    sourceType: "work_item",
    sourceId: "wi1",
    projectId: "p1",
    severity: "info",
    title: "x",
    reason: "x",
    status: "x",
    ...overrides,
  };
}

describe("prioritizeBriefItems", () => {
  it("blocking avant warning avant info", () => {
    const items = [item({ id: "i", severity: "info" }), item({ id: "w", severity: "warning" }), item({ id: "b", severity: "blocking" })];
    expect(prioritizeBriefItems(items, NOW).map((i) => i.id)).toEqual(["b", "w", "i"]);
  });

  it("à sévérité égale : en retard avant échéance future avant sans échéance", () => {
    const items = [
      item({ id: "none", severity: "warning", dueDate: undefined }),
      item({ id: "future", severity: "warning", dueDate: FUTURE }),
      item({ id: "late", severity: "warning", dueDate: PAST }),
    ];
    expect(prioritizeBriefItems(items, NOW).map((i) => i.id)).toEqual(["late", "future", "none"]);
  });

  it("parmi les items en retard : le plus ancien (le plus en retard) en premier", () => {
    const items = [item({ id: "recent", severity: "warning", dueDate: PAST }), item({ id: "oldest", severity: "warning", dueDate: EARLIER_PAST })];
    expect(prioritizeBriefItems(items, NOW).map((i) => i.id)).toEqual(["oldest", "recent"]);
  });

  it("parmi les items futurs : l'échéance la plus proche en premier", () => {
    const items = [item({ id: "later", severity: "warning", dueDate: LATER_FUTURE }), item({ id: "sooner", severity: "warning", dueDate: FUTURE })];
    expect(prioritizeBriefItems(items, NOW).map((i) => i.id)).toEqual(["sooner", "later"]);
  });

  it("tie-break déterministe : sourceType puis sourceId", () => {
    const items = [
      item({ id: "b", sourceType: "risk", sourceId: "r1", severity: "warning" }),
      item({ id: "a", sourceType: "work_item", sourceId: "z", severity: "warning" }),
      item({ id: "c", sourceType: "work_item", sourceId: "a", severity: "warning" }),
    ];
    expect(prioritizeBriefItems(items, NOW).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("déterminisme : deux tris identiques produisent le même ordre", () => {
    const items = [
      item({ id: "1", severity: "warning", dueDate: FUTURE }),
      item({ id: "2", severity: "blocking" }),
      item({ id: "3", severity: "info", dueDate: PAST }),
    ];
    expect(prioritizeBriefItems(items, NOW)).toEqual(prioritizeBriefItems(items, NOW));
  });

  it("ne mute jamais le tableau d'entrée (retourne une nouvelle liste)", () => {
    const items = [item({ id: "b", severity: "warning" }), item({ id: "a", severity: "blocking" })];
    const original = [...items];
    prioritizeBriefItems(items, NOW);
    expect(items).toEqual(original);
  });

  it("liste vide => liste vide", () => {
    expect(prioritizeBriefItems([], NOW)).toEqual([]);
  });
});
