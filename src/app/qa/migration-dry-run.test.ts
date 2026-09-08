import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateLegacyActions, type LegacyAction } from "../../migration/migrate-legacy-actions";

/**
 * "Tester la migration sur copie" (cadrage / mission QA) : on part d'un
 * export figé du prototype (fixture, jamais modifiée), on migre vers un
 * fichier dérivé dans un répertoire temporaire, et on vérifie l'intégrité
 * du résultat. Rejouer ce test produit exactement le même fichier de
 * sortie -> migration reproductible.
 */
describe("Migration à blanc sur copie d'export prototype", () => {
  const fixturePath = join(__dirname, "fixtures", "legacy-export-sample.json");

  it("migre sans perte, sans orpheline, en préservant la source Carnet", () => {
    const original = readFileSync(fixturePath, "utf-8");
    const legacyActions: LegacyAction[] = JSON.parse(original);

    const migrated = migrateLegacyActions(legacyActions);

    // Copie de travail : jamais d'écriture sur la fixture elle-même.
    const outDir = mkdtempSync(join(tmpdir(), "indx-migration-dry-run-"));
    const outPath = join(outDir, "migrated.json");
    writeFileSync(outPath, JSON.stringify(migrated, null, 2));

    // Le fichier source n'a pas bougé.
    expect(readFileSync(fixturePath, "utf-8")).toBe(original);

    // Aucune perte : même nombre d'enregistrements, mêmes ids.
    expect(migrated).toHaveLength(legacyActions.length);
    expect(migrated.map((a) => a.id).sort()).toEqual(legacyActions.map((a) => a.id).sort());

    // Aucune action orpheline : workspaceId toujours renseigné et repris tel quel.
    for (const action of migrated) {
      expect(action.workspaceId).toBeTruthy();
    }

    // Source Carnet préservée.
    const fromNote = migrated.find((a) => a.id === "legacy-004");
    expect(fromNote?.sourceNoteId).toBe("note-carnet-17");

    // Champs contradictoires (legacy-002 a dueDate + week + month) résolus
    // par priorité dueDate > week > month, sans exception ni perte silencieuse.
    const contradictory = migrated.find((a) => a.id === "legacy-002");
    expect(contradictory?.schedule).toEqual({ granularity: "day", value: "2026-09-11" });

    // Statuts et priorités intégralement conservés.
    const byId = new Map(legacyActions.map((a) => [a.id, a]));
    for (const action of migrated) {
      const source = byId.get(action.id)!;
      expect(action.status).toBe(source.status);
      expect(action.priority).toBe(source.priority);
    }
  });

  it("est reproductible : deux exécutions produisent un JSON strictement identique", () => {
    const legacyActions: LegacyAction[] = JSON.parse(readFileSync(fixturePath, "utf-8"));
    const first = JSON.stringify(migrateLegacyActions(legacyActions));
    const second = JSON.stringify(migrateLegacyActions(legacyActions));
    expect(second).toBe(first);
  });
});
