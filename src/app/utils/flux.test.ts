import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import { buildFlux } from "./flux";

const NOW = new Date("2026-11-03T11:00:00Z");
const tz = "Europe/Paris";
let seq = 0;
function action(overrides: Partial<Action> = {}): Action {
  seq += 1;
  return {
    id: `a${seq}`,
    workspaceId: "w1",
    title: `Action ${seq}`,
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}
const day = (value: string) => ({ granularity: "day" as const, value });

describe("buildFlux", () => {
  it("met au focus l'urgent le plus prioritaire, puis range par horizon", () => {
    const late = action({ schedule: day("2026-11-01") });
    const todayHigh = action({ schedule: day("2026-11-03"), priority: "high" });
    const tomorrow = action({ schedule: day("2026-11-04") });
    const waiting = action({ status: "waiting" });
    const someday = action();
    const done = action({ status: "done", completedAt: "2026-11-03T08:00:00.000Z" });

    const flux = buildFlux([late, todayHigh, tomorrow, waiting, someday, done], tz, NOW);

    expect(flux.focus).toBe(todayHigh);
    expect(flux.now).toEqual([late]);
    expect(flux.soon).toEqual([tomorrow]);
    expect(flux.waiting).toEqual([waiting]);
    expect(flux.someday).toEqual([someday]);
    expect(flux.doneToday).toBe(1);
  });

  it("journée libre : focus sur la prochaine échéance, sinon rien", () => {
    const tomorrow = action({ schedule: day("2026-11-04") });
    expect(buildFlux([tomorrow], tz, NOW).focus).toBe(tomorrow);
    expect(buildFlux([action()], tz, NOW).focus).toBeNull();
  });

  it("une action bloquée n'est jamais le focus", () => {
    const blocked = action({ status: "blocked", schedule: day("2026-11-03"), priority: "high" });
    const flux = buildFlux([blocked], tz, NOW);
    expect(flux.focus).toBeNull();
    expect(flux.now).toEqual([blocked]);
  });
});
