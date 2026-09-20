import { describe, expect, it } from "vitest";
import { PROJECT_PACK_CATALOG, findProjectPack } from "./catalog";
import { packKey } from "./types";

describe("PROJECT_PACK_CATALOG", () => {
  it("contient exactement 4 packs", () => {
    expect(PROJECT_PACK_CATALOG).toHaveLength(4);
  });

  it("aucun id@version en double", () => {
    const keys = PROJECT_PACK_CATALOG.map(packKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("les 4 packs attendus sont présents", () => {
    const keys = PROJECT_PACK_CATALOG.map(packKey);
    expect(keys).toEqual(["standard-it-project@1", "migration@1", "business-analysis@1", "run-improvement@1"]);
  });

  it("run-improvement@1 n'a aucun stage (fonctionnement continu, pas un faux cycle séquentiel)", () => {
    const pack = findProjectPack("run-improvement", 1);
    expect(pack?.stages).toEqual([]);
    expect(pack?.milestones[0]?.stageIndex).toBeUndefined();
  });

  it("tous les targetOffsetDays sont des entiers >= 0", () => {
    for (const pack of PROJECT_PACK_CATALOG) {
      for (const milestone of pack.milestones) {
        expect(Number.isInteger(milestone.targetOffsetDays)).toBe(true);
        expect(milestone.targetOffsetDays).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("tout stageIndex référencé existe bien dans pack.stages", () => {
    for (const pack of PROJECT_PACK_CATALOG) {
      for (const milestone of pack.milestones) {
        if (milestone.stageIndex !== undefined) {
          expect(pack.stages[milestone.stageIndex]).toBeDefined();
        }
      }
    }
  });

  it("aucun pack ne référence Risk/Issue/Decision/ChangeRequest/Evidence (absence structurelle)", () => {
    for (const pack of PROJECT_PACK_CATALOG) {
      expect(pack).not.toHaveProperty("risks");
      expect(pack).not.toHaveProperty("issues");
      expect(pack).not.toHaveProperty("decisions");
      expect(pack).not.toHaveProperty("changeRequests");
      expect(pack).not.toHaveProperty("evidence");
      expect(pack).not.toHaveProperty("workItems");
    }
  });

  it("findProjectPack retourne undefined pour un id/version inconnu", () => {
    expect(findProjectPack("inexistant", 1)).toBeUndefined();
    expect(findProjectPack("migration", 99)).toBeUndefined();
  });

  it("le catalogue n'est jamais muté par la lecture", () => {
    const snapshot = JSON.parse(JSON.stringify(PROJECT_PACK_CATALOG));
    findProjectPack("migration", 1);
    expect(PROJECT_PACK_CATALOG).toEqual(snapshot);
  });
});
