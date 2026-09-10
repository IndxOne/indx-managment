import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./filter-actions";
import { resolveQuickFilters } from "./quick-filters";

describe("resolveQuickFilters", () => {
  it("ignore les ids sans champ réel derrière (byAssignee, technicalDebt, currentPhase, today)", () => {
    expect(resolveQuickFilters(["byAssignee", "technicalDebt", "currentPhase", "today"])).toEqual([]);
  });

  it("garde uniquement les ids reconnus, dans l'ordre du preset", () => {
    const chips = resolveQuickFilters(["waiting", "unknownId", "highPriority"]);
    expect(chips.map((chip) => chip.id)).toEqual(["waiting", "highPriority"]);
  });

  it("apply bascule le critère et isActive le reflète", () => {
    const [done] = resolveQuickFilters(["done"]);
    if (!done) throw new Error("quick filter 'done' introuvable");
    expect(done.isActive(EMPTY_FILTERS)).toBe(false);
    const withDone = done.apply(EMPTY_FILTERS);
    expect(done.isActive(withDone)).toBe(true);
    expect(done.apply(withDone)).toEqual(EMPTY_FILTERS);
  });
});
