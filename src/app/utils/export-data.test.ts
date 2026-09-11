import { describe, expect, it } from "vitest";
import { EMPTY_STATE } from "../adapters/store-context";
import { buildExportPayload, EXPORT_FORMAT_VERSION } from "./export-data";

describe("buildExportPayload", () => {
  it("reprend l'état complet avec l'horodatage, le hash utilisateur et le numéro de format", () => {
    const state = {
      ...EMPTY_STATE,
      workspaces: [{ id: "w1" } as never],
      carnetNotes: [{ id: "n1", text: "idée", createdAt: "2026-09-01T00:00:00.000Z" }],
    };
    const payload = buildExportPayload(state, "hash-1", new Date("2026-09-10T12:00:00.000Z"));
    expect(payload).toEqual({
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: "2026-09-10T12:00:00.000Z",
      userHash: "hash-1",
      workspaces: state.workspaces,
      actionsByWorkspace: {},
      recurrenceRulesByWorkspace: {},
      carnetNotes: state.carnetNotes,
      membersByWorkspace: {},
    });
  });

  it("inclut membersByWorkspace quand présent dans l'état", () => {
    const state = {
      ...EMPTY_STATE,
      membersByWorkspace: { w1: [{ id: "m1", workspaceId: "w1", displayName: "Koffi", active: true, createdAt: "x", updatedAt: "x" }] },
    };
    const payload = buildExportPayload(state, "hash-1", new Date("2026-09-10T12:00:00.000Z"));
    expect(payload.membersByWorkspace).toEqual(state.membersByWorkspace);
  });
});
