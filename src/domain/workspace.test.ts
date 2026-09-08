import { describe, expect, it } from "vitest";
import { changeWorkspaceApproach, createWorkspace } from "./workspace";
import { isRecommendedApproach } from "../presets/preset-registry";

describe("createWorkspace", () => {
  it("applique l'approche par défaut selon la nature", () => {
    const run = createWorkspace({ id: "w1", name: "RUN SI quotidien", kind: "run", now: "2026-09-08T00:00:00.000Z" });
    expect(run.approach).toBe("it_ops");
    const project = createWorkspace({ id: "w2", name: "Cybersec", kind: "project", now: "2026-09-08T00:00:00.000Z" });
    expect(project.approach).toBe("project_amoa");
  });

  it("mode collaboratif par défaut : solo", () => {
    const ws = createWorkspace({ id: "w1", name: "Test", kind: "run" });
    expect(ws.collaborationMode).toBe("solo");
  });

  it("rejette un nom vide", () => {
    expect(() => createWorkspace({ id: "w1", name: "   ", kind: "run" })).toThrow();
  });

  it("rejette une approche inconnue (données invalides)", () => {
    expect(() =>
      // @ts-expect-error -- approche volontairement invalide pour le test
      createWorkspace({ id: "w1", name: "Test", kind: "run", approach: "bogus" })
    ).toThrow();
  });

  it("autorise une combinaison non recommandée sans bloquer (aucun blocage artificiel)", () => {
    expect(isRecommendedApproach("project", "it_ops")).toBe(false);
    expect(() =>
      createWorkspace({ id: "w1", name: "Test", kind: "project", approach: "it_ops" })
    ).not.toThrow();
  });
});

describe("changeWorkspaceApproach", () => {
  it("ne modifie que approach et updatedAt", () => {
    const ws = createWorkspace({ id: "w1", name: "Test", kind: "run", now: "2026-09-08T00:00:00.000Z" });
    const updated = changeWorkspaceApproach(ws, "management", "2026-09-09T00:00:00.000Z");
    expect(updated.approach).toBe("management");
    expect(updated.updatedAt).toBe("2026-09-09T00:00:00.000Z");
    expect(updated.id).toBe(ws.id);
    expect(updated.kind).toBe(ws.kind);
    expect(updated.createdAt).toBe(ws.createdAt);
  });

  it("est un no-op si l'approche est identique", () => {
    const ws = createWorkspace({ id: "w1", name: "Test", kind: "run", now: "2026-09-08T00:00:00.000Z" });
    const result = changeWorkspaceApproach(ws, ws.approach, "2026-09-09T00:00:00.000Z");
    expect(result).toBe(ws);
  });
});
