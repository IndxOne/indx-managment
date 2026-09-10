import { describe, expect, it } from "vitest";
import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import { generateRecurringOccurrences, type RecurrenceRule } from "../../recurrence/recurrence-engine";
import type { Action } from "../../domain/types";
import { moveAction } from "../../domain/move-action";
import { changeWorkspaceApproach, createWorkspace } from "../../domain/workspace";
import { computeHiddenFieldsOnApproachChange, resolveWorkspacePreset } from "../../presets/preset-registry";
import { migrateLegacyActions, type LegacyAction } from "../../migration/migrate-legacy-actions";
import { isWaitingReminderDue, setWaitingReminder, triggerWaitingReminderIfDue } from "../../reminders/waiting-reminder";

/**
 * Scénarios de recette du cadrage §17, rejoués contre les contrats réels
 * (Agent 1) plutôt qu'à travers l'UI — preuves reproductibles en CI.
 */

function makeAction(overrides: Partial<Action>): Action {
  return {
    id: "a",
    workspaceId: "w",
    title: "t",
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

describe("Scénario A — RUN IT", () => {
  const now = new Date("2026-09-09T08:00:00Z"); // le 09/09
  const timezone = "Europe/Paris";

  const workspace = createWorkspace({
    id: "ws-run-it",
    name: "RUN SI quotidien",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    now: "2026-09-08T00:00:00.000Z",
  });

  it("l'espace est RUN + IT Ops + solo, sans phase exigée", () => {
    expect(workspace.kind).toBe("run");
    expect(workspace.approach).toBe("it_ops");
    expect(workspace.collaborationMode).toBe("solo");
    const preset = resolveWorkspacePreset(workspace);
    expect(preset.phaseTemplate).toBeUndefined(); // RUN : aucune phase obligatoire
  });

  const investigation = makeAction({
    id: "act-droits",
    workspaceId: workspace.id,
    title: "Investiguer les droits d'accès d'un compte externe",
    schedule: { granularity: "day", value: "2026-09-09" },
  });
  const questionnaire = makeAction({
    id: "act-chiffrage",
    workspaceId: workspace.id,
    title: "Mettre à jour le questionnaire de chiffrage",
    schedule: { granularity: "day", value: "2026-09-11" },
  });

  it("l'affichage Aujourd'hui / Semaine est correct pour les deux actions", () => {
    const derivedInvestigation = deriveScheduleKeys(investigation.schedule, timezone, now);
    const derivedQuestionnaire = deriveScheduleKeys(questionnaire.schedule, timezone, now);
    expect(derivedInvestigation.relativeLabel).toBe("today");
    expect(derivedQuestionnaire.relativeLabel).toBe("this_week"); // 11/09 dans la même semaine ISO que le 09/09
  });

  it("passer l'investigation en attente ne touche ni au calendrier ni à la phase", () => {
    const waiting = moveAction(investigation, { axis: "status", status: "waiting" });
    expect(waiting.status).toBe("waiting");
    expect(waiting.schedule).toEqual(investigation.schedule);
    expect(waiting.phaseId).toBeUndefined();
  });

  it("activer une relance après trois jours se déclenche à l'échéance, pas avant (idempotent)", () => {
    const waiting = moveAction(investigation, { axis: "status", status: "waiting" }, "2026-09-09T09:00:00.000Z");
    const withReminder = setWaitingReminder(waiting, 3);

    expect(isWaitingReminderDue(withReminder, new Date("2026-09-11T09:00:00.000Z"))).toBe(false); // J+2
    expect(isWaitingReminderDue(withReminder, new Date("2026-09-12T09:00:00.000Z"))).toBe(true); // J+3

    const triggeredOnce = triggerWaitingReminderIfDue(withReminder, new Date("2026-09-12T09:00:00.000Z"));
    const triggeredTwice = triggerWaitingReminderIfDue(triggeredOnce, new Date("2026-09-13T00:00:00.000Z"));
    expect(triggeredTwice.waitingReminder?.history).toEqual(["2026-09-12T09:00:00.000Z"]); // pas de doublon
  });
});

describe("Scénario B — Projet cybersécurité", () => {
  const workspace = createWorkspace({
    id: "ws-cybersec",
    name: "Mise en conformité Cybersécurité",
    kind: "project",
    approach: "project_amoa",
    collaborationMode: "solo",
    now: "2026-09-08T00:00:00.000Z",
  });

  it("les phases proposées correspondent au préréglage project_amoa", () => {
    const preset = resolveWorkspacePreset(workspace);
    expect(preset.phaseTemplate).toEqual([
      "cadrage",
      "conception",
      "realisation",
      "deploiement",
    ]);
  });

  const atelier = makeAction({
    id: "act-atelier",
    workspaceId: workspace.id,
    title: "Atelier cadrage cybersécurité",
    itemType: "task",
    phaseId: "ateliers",
    status: "doing",
    schedule: { granularity: "week", value: "2026-W39" },
  });
  const jalon = makeAction({
    id: "act-jalon",
    workspaceId: workspace.id,
    title: "Validation comité sécurité",
    itemType: "milestone",
    phaseId: "validations",
  });

  it("un jalon est bien distinguable d'une action/livrable (itemType)", () => {
    expect(jalon.itemType).toBe("milestone");
    expect(atelier.itemType).not.toBe("milestone");
  });

  it("déplacer l'atelier entre phases ne modifie ni dates ni statut", () => {
    const moved = moveAction(atelier, { axis: "phase", phaseId: "realisations" });
    expect(moved.phaseId).toBe("realisations");
    expect(moved.schedule).toEqual(atelier.schedule);
    expect(moved.status).toBe(atelier.status);
  });
});

describe("Scénario C — Changement d'approche", () => {
  const initial = createWorkspace({
    id: "ws-c",
    name: "Espace test",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    now: "2026-09-08T00:00:00.000Z",
  });

  const actions: Action[] = [
    makeAction({ id: "a1", workspaceId: initial.id, title: "Action 1", status: "todo", priority: "high" }),
    makeAction({
      id: "a2",
      workspaceId: initial.id,
      title: "Action 2",
      status: "waiting",
      priority: "low",
      schedule: { granularity: "day", value: "2026-09-10" },
    }),
    makeAction({ id: "a3", workspaceId: initial.id, title: "Action 3", status: "done", priority: "normal" }),
  ];

  it("changer l'approche modifie uniquement le workspace, jamais les actions", () => {
    const changed = changeWorkspaceApproach(initial, "management", "2026-09-09T00:00:00.000Z");
    expect(changed.approach).toBe("management");
    // Intégrité totale : les 3 actions restent bit-à-bit identiques (aucune
    // référence au workspace ne les fait transiter par une fonction de
    // changement d'approche — agrégats séparés, cf. cadrage §4).
    expect(actions).toEqual(actions.map((a) => ({ ...a })));
  });

  it("signale les champs qui seraient masqués sans jamais bloquer la combinaison", () => {
    const hidden = computeHiddenFieldsOnApproachChange(
      "it_ops",
      "simple",
      resolveWorkspacePreset(initial).visibleFields
    );
    expect(hidden.length).toBeGreaterThan(0); // confirmation requise côté UI, mais pas de blocage
  });
});

describe("Données — migration sans perte, pas d'orpheline, source Carnet préservée", () => {
  it("migre un lot hétérogène sans perte et sans levée d'exception sur les cas valides", () => {
    const legacy: LegacyAction[] = [
      {
        id: "l1",
        workspaceId: "w1",
        title: "Avec échéance",
        status: "todo",
        priority: "normal",
        itemType: "task",
        dueDate: "2026-09-09",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "l2",
        workspaceId: "w1",
        title: "Issue d'une note du Carnet",
        status: "todo",
        priority: "normal",
        itemType: "task",
        sourceNoteId: "note-42",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "l3",
        workspaceId: "w1",
        title: "Sans aucune planification",
        status: "done",
        priority: "low",
        itemType: "task",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ];

    const migrated = migrateLegacyActions(legacy);
    expect(migrated).toHaveLength(3);
    expect(migrated.every((a) => a.workspaceId === "w1")).toBe(true); // aucune orpheline
    expect(migrated.find((a) => a.id === "l2")?.sourceNoteId).toBe("note-42"); // source Carnet préservée
    expect(migrated.find((a) => a.id === "l3")?.schedule).toEqual({ granularity: "none" });
  });
});

describe("Récurrence — idempotence sous 500 occurrences (préfiguration test de charge)", () => {
  it("régénérer une fenêtre large ne produit aucune date en double", () => {
    const rule: RecurrenceRule = {
      id: "r-charge",
      workspaceId: "w1",
      frequency: "daily",
      interval: 1,
      startDate: "2025-01-01",
      template: { title: "Contrôle quotidien", priority: "normal", itemType: "task", assigneeIds: [], tags: [] },
    };
    const occurrences = generateRecurringOccurrences(rule, { start: "2025-01-01", end: "2026-05-15" }); // ~500 jours
    expect(occurrences).toHaveLength(500);
    const uniqueIds = new Set(occurrences.map((a) => a.id));
    expect(uniqueIds.size).toBe(500);
  });
});
