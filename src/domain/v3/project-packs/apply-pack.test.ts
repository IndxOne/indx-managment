import { describe, expect, it } from "vitest";
import type { Project } from "../types";
import { applyProjectPack } from "./apply-pack";
import { findProjectPack } from "./catalog";
import type { ProjectPack } from "./types";

const NOW = "2026-09-20T08:00:00.000Z";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    workspaceId: "w1",
    name: "Migration M365",
    method: "predictive",
    criticality: "high",
    status: "on_track",
    objectiveIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const migrationPack = findProjectPack("migration", 1)!;
const runPack = findProjectPack("run-improvement", 1)!;

describe("applyProjectPack — déterminisme", () => {
  it("deux appels avec les mêmes entrées produisent une sortie strictement identique", () => {
    const first = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    const second = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(first).toEqual(second);
  });

  it("les IDs sont dérivés de project.id + pack.id@version + type + index (stables entre deux runs)", () => {
    const a = applyProjectPack({ project: project({ id: "pA" }), pack: migrationPack, now: NOW });
    const b = applyProjectPack({ project: project({ id: "pA" }), pack: migrationPack, now: NOW });
    if (!a.ok || !b.ok) throw new Error("attendu ok");
    expect(a.state.stages.map((s) => s.id)).toEqual(b.state.stages.map((s) => s.id));
    expect(a.state.milestones.map((m) => m.id)).toEqual(b.state.milestones.map((m) => m.id));
  });

  it("des projets différents produisent des IDs différents pour le même pack", () => {
    const a = applyProjectPack({ project: project({ id: "pA" }), pack: migrationPack, now: NOW });
    const b = applyProjectPack({ project: project({ id: "pB" }), pack: migrationPack, now: NOW });
    if (!a.ok || !b.ok) throw new Error("attendu ok");
    expect(a.state.stages[0]!.id).not.toBe(b.state.stages[0]!.id);
  });

  it("aucune mutation du catalogue (pack en entrée non modifié)", () => {
    const snapshot = JSON.parse(JSON.stringify(migrationPack));
    applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(migrationPack).toEqual(snapshot);
  });
});

describe("applyProjectPack — contenu produit", () => {
  it("crée exactement les stages/objectifs/jalons du pack, avec stageId résolu", () => {
    const result = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stages).toHaveLength(4);
    expect(result.state.objectives).toHaveLength(1);
    expect(result.state.milestones).toHaveLength(4);
    expect(result.state.milestones[0]!.stageId).toBe(result.state.stages[0]!.id);
  });

  it("run-improvement@1 fonctionne avec zéro Stage (jalon sans stageId, jamais d'erreur)", () => {
    const result = applyProjectPack({ project: project(), pack: runPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stages).toEqual([]);
    expect(result.state.milestones).toHaveLength(1);
    expect(result.state.milestones[0]!.stageId).toBeUndefined();
  });

  it("targetOffsetDays est ajouté en UTC, sans dépendance DST/timezone (0, 1, 365 jours)", () => {
    const pack: ProjectPack = {
      ...migrationPack,
      milestones: [
        { observableResult: "J+0", targetOffsetDays: 0 },
        { observableResult: "J+1", targetOffsetDays: 1 },
        { observableResult: "J+365", targetOffsetDays: 365 },
      ],
    };
    const result = applyProjectPack({ project: project(), pack, now: "2026-03-01T23:30:00.000Z" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.milestones[0]!.targetDate).toBe("2026-03-01T23:30:00.000Z");
    expect(result.state.milestones[1]!.targetDate).toBe("2026-03-02T23:30:00.000Z");
    expect(result.state.milestones[2]!.targetDate).toBe("2027-03-01T23:30:00.000Z");
  });

  it("targetOffsetDays traversant un changement d'heure DST local reste un ajout UTC exact", () => {
    // Bascule d'heure d'été européenne (dernier dimanche de mars) : si
    // l'implémentation utilisait une arithmétique locale, +1 jour glisserait
    // d'1h. En UTC, l'écart reste exactement 24h.
    const pack: ProjectPack = { ...migrationPack, milestones: [{ observableResult: "traverse DST", targetOffsetDays: 1 }] };
    const result = applyProjectPack({ project: project(), pack, now: "2026-03-28T10:00:00.000Z" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.milestones[0]!.targetDate).toBe("2026-03-29T10:00:00.000Z");
  });

  it("project.method/status ne sont jamais modifiés (pack.method reste informatif)", () => {
    const input = project({ method: "agile", status: "at_risk" });
    const result = applyProjectPack({ project: input, pack: migrationPack, now: NOW }); // pack.method = "predictive"
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.project.method).toBe("agile");
    expect(result.state.project.status).toBe("at_risk");
  });

  it("aucune mutation de Project autre que objectiveIds/updatedAt", () => {
    const input = project();
    const result = applyProjectPack({ project: input, pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const output = result.state.project;
    expect(output.id).toBe(input.id);
    expect(output.workspaceId).toBe(input.workspaceId);
    expect(output.name).toBe(input.name);
    expect(output.method).toBe(input.method);
    expect(output.criticality).toBe(input.criticality);
    expect(output.status).toBe(input.status);
    expect(output.createdAt).toBe(input.createdAt);
    expect(output.objectiveIds).toEqual(result.state.objectives.map((o) => o.id));
  });

  it("aucun Risk/Issue/Decision/ChangeRequest/Evidence produit", () => {
    const result = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).not.toHaveProperty("risks");
    expect(result.state).not.toHaveProperty("issues");
    expect(result.state).not.toHaveProperty("decisions");
    expect(result.state).not.toHaveProperty("changeRequests");
    expect(result.state).not.toHaveProperty("evidence");
  });
});

describe("applyProjectPack — événements", () => {
  it("agrège les événements des sous-commandes dans l'ordre stages puis objectives puis milestones, project.pack_selected en dernier", () => {
    const result = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // createStage/createObjective/createMilestone n'émettent aujourd'hui
    // aucun événement dédié (rien à inventer, §2 du correctif) : seul
    // project.pack_selected est produit, mais toujours en dernière position
    // (garantie testée même si une future commande venait à en émettre).
    expect(result.events[result.events.length - 1]).toEqual({
      type: "project.pack_selected",
      occurredAt: NOW,
      projectId: "p1",
      payload: { packId: "migration", packVersion: 1 },
    });
  });

  it("project.pack_selected est présent exactement une fois", () => {
    const result = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const packSelected = result.events.filter((e) => e.type === "project.pack_selected");
    expect(packSelected).toHaveLength(1);
  });

  it("le payload ne contient que packId/packVersion — jamais le pack entier ni projectId/occurredAt dupliqués", () => {
    const result = applyProjectPack({ project: project(), pack: migrationPack, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const event = result.events.find((e) => e.type === "project.pack_selected")!;
    expect(event.payload).toEqual({ packId: "migration", packVersion: 1 });
  });
});

describe("applyProjectPack — validation", () => {
  it("refuse un targetOffsetDays négatif", () => {
    const pack: ProjectPack = { ...migrationPack, milestones: [{ observableResult: "invalide", targetOffsetDays: -1 }] };
    const result = applyProjectPack({ project: project(), pack, now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("project_pack_invalid");
  });

  it("refuse un targetOffsetDays non entier", () => {
    const pack: ProjectPack = { ...migrationPack, milestones: [{ observableResult: "invalide", targetOffsetDays: 2.5 }] };
    const result = applyProjectPack({ project: project(), pack, now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("project_pack_invalid");
  });

  it("n'écrit rien (aucune entité) si la validation échoue", () => {
    const pack: ProjectPack = {
      ...migrationPack,
      milestones: [{ observableResult: "ok", targetOffsetDays: 5 }, { observableResult: "invalide", targetOffsetDays: -1 }],
    };
    const result = applyProjectPack({ project: project(), pack, now: NOW });
    expect(result.ok).toBe(false);
  });
});
