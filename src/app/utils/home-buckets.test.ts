import { describe, expect, it } from "vitest";
import type { Action } from "../../domain/types";
import { deriveHomeBuckets } from "./home-buckets";

const NOW = new Date("2026-09-11T10:00:00.000Z"); // vendredi 2026-W37
const TZ = "Europe/Paris";

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: overrides.id ?? "a1",
    workspaceId: "w1",
    title: "Action",
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

describe("deriveHomeBuckets", () => {
  it("classe une action échéant aujourd'hui dans « today »", () => {
    const action = makeAction({ schedule: { granularity: "day", value: "2026-09-11" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.today).toEqual([action]);
    expect(buckets.overdue).toEqual([]);
    expect(buckets.blocked).toEqual([]);
    expect(buckets.thisWeekPreview).toEqual([]);
  });

  it("classe une action à échéance passée, non bloquée, dans « overdue »", () => {
    const action = makeAction({ schedule: { granularity: "day", value: "2026-09-09" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.overdue).toEqual([action]);
    expect(buckets.today).toEqual([]);
  });

  it("classe une action bloquée sans retard dans « blocked »", () => {
    const action = makeAction({ status: "blocked", schedule: { granularity: "day", value: "2026-09-11" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.blocked).toEqual([action]);
    expect(buckets.today).toEqual([]);
  });

  it("une action en retard ET bloquée n'apparaît que dans « overdue », jamais dupliquée dans « blocked »", () => {
    const action = makeAction({ status: "blocked", schedule: { granularity: "day", value: "2026-09-01" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.overdue).toEqual([action]);
    expect(buckets.blocked).toEqual([]);
    // Le badge "Bloqué" affiché sur la carte se base directement sur action.status, pas sur un second champ.
    expect(action.status).toBe("blocked");
  });

  it("exclut toujours les actions terminées, même en retard ou bloquées", () => {
    const overdueDone = makeAction({ id: "a1", status: "done", schedule: { granularity: "day", value: "2026-09-01" } });
    const blockedDone = makeAction({ id: "a2", status: "done" });
    const buckets = deriveHomeBuckets([overdueDone, blockedDone], TZ, NOW);
    expect(buckets.overdue).toEqual([]);
    expect(buckets.blocked).toEqual([]);
    expect(buckets.today).toEqual([]);
    expect(buckets.thisWeekPreview).toEqual([]);
  });

  it("classe demain et le reste de la semaine dans l'aperçu « thisWeekPreview »", () => {
    const tomorrow = makeAction({ id: "a1", schedule: { granularity: "day", value: "2026-09-12" } });
    const laterThisWeek = makeAction({ id: "a2", schedule: { granularity: "day", value: "2026-09-13" } });
    const buckets = deriveHomeBuckets([tomorrow, laterThisWeek], TZ, NOW);
    expect(buckets.thisWeekPreview).toEqual([tomorrow, laterThisWeek]);
  });

  it("n'affiche rien pour une action sans échéance, non bloquée (Home n'est pas exhaustif)", () => {
    const action = makeAction({ schedule: { granularity: "none" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.today).toEqual([]);
    expect(buckets.overdue).toEqual([]);
    expect(buckets.blocked).toEqual([]);
    expect(buckets.thisWeekPreview).toEqual([]);
  });

  it("n'affiche rien pour une action planifiée au-delà de la semaine", () => {
    const action = makeAction({ schedule: { granularity: "week", value: "2026-W40" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.today).toEqual([]);
    expect(buckets.thisWeekPreview).toEqual([]);
  });

  it("une action « waiting » due aujourd'hui reste visible dans « today » (pas de section dédiée en attente sur Home)", () => {
    const action = makeAction({ status: "waiting", schedule: { granularity: "day", value: "2026-09-11" } });
    const buckets = deriveHomeBuckets([action], TZ, NOW);
    expect(buckets.today).toEqual([action]);
  });
});
