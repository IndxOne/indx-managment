import { afterEach, describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { shareAction, shareText } from "./share-action";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Relancer le prestataire",
    status: "waiting",
    priority: "normal",
    itemType: "task",
    schedule: { granularity: "day", value: "2026-09-09" },
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("shareAction", () => {
  it("utilise navigator.share quand disponible", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { share });
    await shareAction(action());
    expect(share).toHaveBeenCalledWith({ title: "Relancer le prestataire", text: shareText(action()) });
  });

  it("ignore l'annulation de l'utilisateur (AbortError)", async () => {
    const share = vi.fn(async () => {
      throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    });
    vi.stubGlobal("navigator", { share });
    await expect(shareAction(action())).resolves.toBeUndefined();
  });

  it("retombe sur le presse-papier si le partage natif n'est pas supporté", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await shareAction(action());
    expect(writeText).toHaveBeenCalledWith(shareText(action()));
  });
});
