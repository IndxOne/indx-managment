import { describe, expect, it } from "vitest";
import { createStage } from "./stage";

const NOW = "2026-09-20T08:00:00.000Z";

describe("createStage", () => {
  it("crée un stage à l'état not_started, sans updatedAt", () => {
    const result = createStage({ id: "s1", projectId: "p1", name: "Cadrage", order: 0, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual({
      id: "s1",
      projectId: "p1",
      name: "Cadrage",
      order: 0,
      status: "not_started",
      createdAt: NOW,
    });
    expect(result.state).not.toHaveProperty("updatedAt");
  });

  it("aucun événement émis (aucune commande de transition ne consomme d'événement Stage à ce jour)", () => {
    const result = createStage({ id: "s1", projectId: "p1", name: "Cadrage", order: 0, now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.events).toEqual([]);
  });
});
