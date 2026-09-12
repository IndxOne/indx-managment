import { describe, expect, it } from "vitest";
import type { Action } from "../../../domain/types";
import type { Workspace } from "../../../domain/workspace";
import type { RecurrenceRule } from "../../../recurrence/recurrence-engine";
import type { Member } from "../../../domain/member";
import {
  actionFromRow,
  actionToRow,
  carnetNoteFromRow,
  carnetNoteToRow,
  memberFromRow,
  memberToRow,
  recurrenceRuleFromRow,
  recurrenceRuleToRow,
  workspaceFromRow,
  workspaceToRow,
} from "./mappers";

const USER_HASH = "test-hash";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "RUN SI quotidien",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    workspaceId: "11111111-1111-1111-1111-111111111111",
    title: "Investiguer les droits d'accès",
    status: "waiting",
    priority: "high",
    itemType: "incident",
    assigneeIds: [],
    tags: [],
    schedule: { granularity: "day", value: "2026-09-09" },
    waitingSince: "2026-09-08T09:00:00.000Z",
    waitingReminder: { afterDays: 3, enabled: true, history: [] },
    createdAt: "2026-09-08T09:00:00.000Z",
    updatedAt: "2026-09-08T09:00:00.000Z",
    ...overrides,
  };
}

function recurrenceRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    workspaceId: "11111111-1111-1111-1111-111111111111",
    frequency: "weekly",
    interval: 1,
    startDate: "2026-09-08",
    template: {
      title: "Contrôle hebdomadaire",
      priority: "normal",
      itemType: "task",
      assigneeIds: [],
      tags: [],
    },
    ...overrides,
  };
}

describe("workspaceToRow / workspaceFromRow", () => {
  it("round-trip sans perte", () => {
    const original = workspace();
    const row = workspaceToRow(original, USER_HASH);
    expect(row.user_hash).toBe(USER_HASH);
    expect(workspaceFromRow(row)).toEqual(original);
  });

  it("description absente devient null en base puis undefined au retour", () => {
    const row = workspaceToRow(workspace({ description: undefined }), USER_HASH);
    expect(row.description).toBeNull();
    expect(workspaceFromRow(row).description).toBeUndefined();
  });
});

describe("actionToRow / actionFromRow", () => {
  it("round-trip sans perte, y compris schedule et relance", () => {
    const original = action();
    const row = actionToRow(original, USER_HASH);
    expect(row.user_hash).toBe(USER_HASH);
    expect(actionFromRow(row)).toEqual(original);
  });

  it("champs optionnels absents deviennent null en base puis undefined au retour", () => {
    const original = action({
      description: undefined,
      phaseId: undefined,
      sourceNoteId: undefined,
      recurrenceRuleId: undefined,
      waitingSince: undefined,
      waitingReminder: undefined,
      completedAt: undefined,
      schedule: { granularity: "none" },
    });
    const row = actionToRow(original, USER_HASH);
    expect(row.description).toBeNull();
    expect(row.phase_id).toBeNull();
    expect(row.waiting_reminder).toBeNull();
    expect(actionFromRow(row)).toEqual(original);
  });

  it("journal de notes : round-trip, tableau vide en base devient absent au retour", () => {
    const withNotes = action({ notes: [{ id: "n1", text: "Relance envoyée", createdAt: "2026-09-08T10:00:00.000Z" }] });
    const row = actionToRow(withNotes, USER_HASH);
    expect(row.notes).toEqual(withNotes.notes);
    expect(actionFromRow(row)).toEqual(withNotes);

    const withoutNotes = actionFromRow(actionToRow(action({ notes: [] }), USER_HASH));
    expect(withoutNotes.notes).toBeUndefined();
  });

  it("lien vers une autre action : round-trip, absence devient null puis undefined", () => {
    const linked = action({ linkedActionId: "33333333-3333-3333-3333-333333333333" });
    const row = actionToRow(linked, USER_HASH);
    expect(row.linked_action_id).toBe(linked.linkedActionId);
    expect(actionFromRow(row)).toEqual(linked);

    const unlinkedRow = actionToRow(action({ linkedActionId: undefined }), USER_HASH);
    expect(unlinkedRow.linked_action_id).toBeNull();
    expect(actionFromRow(unlinkedRow).linkedActionId).toBeUndefined();
  });
});

describe("recurrenceRuleToRow / recurrenceRuleFromRow", () => {
  it("round-trip sans perte", () => {
    const original = recurrenceRule({ endDate: "2026-12-31", template: { title: "X", priority: "high", itemType: "task", phaseId: "cadrage", assigneeIds: [], tags: [] } });
    const row = recurrenceRuleToRow(original, USER_HASH);
    expect(row.user_hash).toBe(USER_HASH);
    expect(recurrenceRuleFromRow({ ...row, created_at: "2026-09-08T00:00:00.000Z" })).toEqual(original);
  });

  it("endDate et phaseId absents deviennent null en base puis undefined au retour", () => {
    const row = recurrenceRuleToRow(recurrenceRule(), USER_HASH);
    expect(row.end_date).toBeNull();
    expect(row.phase_id).toBeNull();
    const rehydrated = recurrenceRuleFromRow({ ...row, created_at: "2026-09-08T00:00:00.000Z" });
    expect(rehydrated.endDate).toBeUndefined();
    expect(rehydrated.template.phaseId).toBeUndefined();
  });
});

describe("carnetNoteToRow / carnetNoteFromRow", () => {
  it("round-trip sans perte", () => {
    const original = { id: "n1", text: "Relancer le prestataire GED", createdAt: "2026-09-09T08:00:00.000Z" };
    const row = carnetNoteToRow(original, USER_HASH);
    expect(row.user_hash).toBe(USER_HASH);
    expect(carnetNoteFromRow(row)).toEqual(original);
  });
});

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    workspaceId: "11111111-1111-1111-1111-111111111111",
    displayName: "Koffi",
    active: true,
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("memberToRow / memberFromRow (Lot 8A)", () => {
  it("round-trip sans perte", () => {
    const original = member();
    const row = memberToRow(original, USER_HASH);
    expect(row.user_hash).toBe(USER_HASH);
    expect(memberFromRow(row)).toEqual(original);
  });

  it("email et avatarUrl absents deviennent null en base puis undefined au retour", () => {
    const row = memberToRow(member(), USER_HASH);
    expect(row.email).toBeNull();
    expect(row.avatar_url).toBeNull();
    const rehydrated = memberFromRow(row);
    expect(rehydrated.email).toBeUndefined();
    expect(rehydrated.avatarUrl).toBeUndefined();
  });

  it("conserve active=false (désactivation)", () => {
    const row = memberToRow(member({ active: false }), USER_HASH);
    expect(row.active).toBe(false);
    expect(memberFromRow(row).active).toBe(false);
  });
});
