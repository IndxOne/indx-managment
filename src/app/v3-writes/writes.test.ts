import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkItem } from "../../domain/v3/types";
import { okResult, failResult } from "../../infrastructure/persistence/v3/errors";

const repo = vi.hoisted(() => ({
  createProjectRow: vi.fn(),
  findProjectById: vi.fn(),
  createObjectiveRow: vi.fn(),
  createWorkItemRow: vi.fn(),
  findWorkItemById: vi.fn(),
  updateWorkItemRow: vi.fn(),
}));
vi.mock("../../infrastructure/persistence/v3/repositories/project-repository", () => ({ createProjectRow: repo.createProjectRow, findProjectById: repo.findProjectById }));
vi.mock("../../infrastructure/persistence/v3/repositories/objective-repository", () => ({ createObjectiveRow: repo.createObjectiveRow }));
vi.mock("../../infrastructure/persistence/v3/repositories/work-item-repository", () => ({
  createWorkItemRow: repo.createWorkItemRow,
  findWorkItemById: repo.findWorkItemById,
  updateWorkItemRow: repo.updateWorkItemRow,
}));

import { addWorkItem, canWriteRole, completeWorkItem, createProjectWithObjective, pickWritableWorkspace } from "./writes";

const del = vi.fn();
const client = {
  from: () => ({ delete: () => ({ eq: del }) }),
  rpc: vi.fn(),
} as unknown as SupabaseClient;
let n = 0;
const deps = { client, newId: () => `id-${++n}`, now: () => "2026-11-16T10:00:00.000Z" };

const item = (status: WorkItem["status"]): WorkItem => ({
  id: "w1", projectId: "p1", type: "task", title: "T", responsibleId: "u1", status, priority: "normal",
  exitCondition: "x", acceptanceCriteria: [], dependencyIds: [], evidenceIds: [],
  createdAt: "2026-11-01T00:00:00.000Z", updatedAt: `u-${status}`,
});

beforeEach(() => {
  vi.clearAllMocks();
  n = 0;
  repo.createProjectRow.mockImplementation(async (_c, p) => okResult(p));
  repo.createObjectiveRow.mockImplementation(async (_c, o) => okResult(o));
  repo.findProjectById.mockResolvedValue(okResult({ id: "p1", workspaceId: "ws1" }));
  repo.createWorkItemRow.mockImplementation(async (_c, w) => okResult(w));
  repo.updateWorkItemRow.mockImplementation(async (_c, w) => okResult({ ...w, updatedAt: `u-${w.status}` }));
});

describe("createProjectWithObjective", () => {
  it("valeurs par défaut métier, objectif possédé par l'utilisateur, échéance en date", async () => {
    const r = await createProjectWithObjective(deps, { workspaceId: "ws1", authUserId: "u1", name: " Site ", objective: " Publier ", dueDate: "2026-12-01" });
    expect(r).toEqual({ ok: true, value: { projectId: "id-1" } });
    const project = repo.createProjectRow.mock.calls[0]![1];
    expect(project).toMatchObject({ name: "Site", method: "predictive", criticality: "medium", status: "on_track", workspaceId: "ws1", targetDate: "2026-12-01T12:00:00.000Z" });
    expect(repo.createObjectiveRow.mock.calls[0]![1]).toMatchObject({ statement: "Publier", ownerId: "u1", projectId: "id-1" });
    expect(repo.createObjectiveRow.mock.calls[0]![2]).toBe("ws1");
  });
  it("rejette nom ou objectif vides sans écrire", async () => {
    expect((await createProjectWithObjective(deps, { workspaceId: "ws1", authUserId: "u1", name: " ", objective: "x" })).ok).toBe(false);
    expect((await createProjectWithObjective(deps, { workspaceId: "ws1", authUserId: "u1", name: "x", objective: "" })).ok).toBe(false);
    expect(repo.createProjectRow).not.toHaveBeenCalled();
  });
  it("échec de l'objectif : le projet est supprimé (pas d'orphelin)", async () => {
    repo.createObjectiveRow.mockResolvedValue(failResult({ kind: "persistence", code: "unknown", message: "x" }));
    const r = await createProjectWithObjective(deps, { workspaceId: "ws1", authUserId: "u1", name: "A", objective: "B" });
    expect(r.ok).toBe(false);
    expect(del).toHaveBeenCalledWith("id", "id-1");
  });
  it("refus RLS : erreur « forbidden », aucun objectif tenté", async () => {
    repo.createProjectRow.mockResolvedValue(failResult({ kind: "authorization", message: "denied" }));
    const r = await createProjectWithObjective(deps, { workspaceId: "ws1", authUserId: "u1", name: "A", objective: "B" });
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(repo.createObjectiveRow).not.toHaveBeenCalled();
  });
});

describe("addWorkItem", () => {
  it("en cours d'emblée, responsable = utilisateur, condition de sortie par défaut sans échéance", async () => {
    const r = await addWorkItem(deps, { projectId: "p1", authUserId: "u1", title: " Appeler " });
    expect(r.ok).toBe(true);
    expect(repo.createWorkItemRow.mock.calls[0]![1]).toMatchObject({ title: "Appeler", status: "in_progress", responsibleId: "u1", exitCondition: "Action réalisée", priority: "normal", type: "task" });
    expect(repo.createWorkItemRow.mock.calls[0]![2]).toBe("ws1");
  });
  it("avec échéance : pas de condition de sortie inventée", async () => {
    await addWorkItem(deps, { projectId: "p1", authUserId: "u1", title: "A", dueDate: "2026-12-01" });
    const w = repo.createWorkItemRow.mock.calls[0]![1];
    expect(w.dueDate).toBe("2026-12-01T12:00:00.000Z");
    expect(w.exitCondition).toBeUndefined();
  });
  it("projet inaccessible ou action vide : aucune écriture", async () => {
    repo.findProjectById.mockResolvedValue(okResult(null));
    expect((await addWorkItem(deps, { projectId: "p1", authUserId: "u1", title: "A" })).ok).toBe(false);
    expect((await addWorkItem(deps, { projectId: "p1", authUserId: "u1", title: " " })).ok).toBe(false);
    expect(repo.createWorkItemRow).not.toHaveBeenCalled();
  });
});

describe("completeWorkItem", () => {
  it("En cours → Validation → Terminé avec concurrence optimiste sur chaque écriture", async () => {
    repo.findWorkItemById.mockResolvedValue(okResult(item("in_progress")));
    const r = await completeWorkItem(deps, "w1");
    expect(r).toEqual({ ok: true, value: { status: "done" } });
    expect(repo.updateWorkItemRow.mock.calls.map((c) => [c[1].status, c[3]])).toEqual([["validation", "u-in_progress"], ["done", "u-validation"]]);
  });
  it("reprise depuis Validation : une seule écriture", async () => {
    repo.findWorkItemById.mockResolvedValue(okResult(item("validation")));
    expect((await completeWorkItem(deps, "w1")).ok).toBe(true);
    expect(repo.updateWorkItemRow).toHaveBeenCalledTimes(1);
  });
  it.each(["blocked", "waiting_external", "to_scope", "ready", "done", "cancelled"] as const)("refuse depuis %s sans écrire", async (s) => {
    repo.findWorkItemById.mockResolvedValue(okResult(item(s)));
    expect(await completeWorkItem(deps, "w1")).toMatchObject({ ok: false, error: { code: "not_completable" } });
    expect(repo.updateWorkItemRow).not.toHaveBeenCalled();
  });
  it("conflit d'écriture : erreur « conflict »", async () => {
    repo.findWorkItemById.mockResolvedValue(okResult(item("in_progress")));
    repo.updateWorkItemRow.mockResolvedValue(failResult({ kind: "persistence", code: "stale_write", message: "x" }));
    expect(await completeWorkItem(deps, "w1")).toMatchObject({ ok: false, error: { code: "conflict" } });
  });
});

describe("rôles", () => {
  it("seuls owner/editor peuvent écrire ; owner préféré ; viewer/aucun rôle → pas d'espace", async () => {
    expect(canWriteRole("owner") && canWriteRole("editor")).toBe(true);
    expect(canWriteRole("viewer") || canWriteRole(null)).toBe(false);
    const rpc = client.rpc as unknown as ReturnType<typeof vi.fn>;
    rpc.mockImplementation(async (_f: string, a: { ws_id: string }) => ({ data: { a: "viewer", b: "editor", c: "owner", d: null }[a.ws_id], error: null }));
    expect(await pickWritableWorkspace(client, ["a", "b", "c"])).toBe("c");
    expect(await pickWritableWorkspace(client, ["a", "d"])).toBeNull();
    rpc.mockResolvedValue({ data: "owner", error: { message: "boom" } });
    expect(await pickWritableWorkspace(client, ["a"])).toBeNull();
  });
});
