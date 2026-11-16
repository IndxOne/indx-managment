import type { SupabaseClient } from "@supabase/supabase-js";
import { createObjective } from "../../domain/v3/commands/objective";
import { createProject } from "../../domain/v3/commands/project";
import { createWorkItem, transitionWorkItem } from "../../domain/v3/commands/work-item";
import type { WorkItem, WorkItemStatus } from "../../domain/v3/types";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { createObjectiveRow } from "../../infrastructure/persistence/v3/repositories/objective-repository";
import { createProjectRow, findProjectById } from "../../infrastructure/persistence/v3/repositories/project-repository";
import { createWorkItemRow, findWorkItemById, updateWorkItemRow } from "../../infrastructure/persistence/v3/repositories/work-item-repository";
import { LIMITS, V3_DEFAULTS } from "./defaults";

export type WriteError = { code: "invalid" | "forbidden" | "not_found" | "conflict" | "not_completable" | "unknown"; message: string };
export type WriteResult<T> = { ok: true; value: T } | { ok: false; error: WriteError };

export interface WriteDeps {
  client: SupabaseClient;
  newId?: () => string;
  now?: () => string;
}

const fail = <T>(code: WriteError["code"], message: string): WriteResult<T> => ({ ok: false, error: { code, message } });

function fromPersistence<T>(error: PersistenceError): WriteResult<T> {
  if (error.kind === "authorization") return fail("forbidden", "Droits insuffisants pour cette modification.");
  if (error.code === "stale_write") return fail("conflict", "Modifié ailleurs : rechargez puis réessayez.");
  if (error.code === "not_found") return fail("not_found", "Élément introuvable ou inaccessible.");
  return fail("unknown", "L'enregistrement a échoué. Réessayez.");
}

const ids = (d: WriteDeps) => d.newId ?? (() => crypto.randomUUID());
const clock = (d: WriteDeps) => d.now ?? (() => new Date().toISOString());

/** Rôle réel de l'utilisateur sur un espace, lu via la fonction SQL workspace_role() (même source que la RLS). */
export async function getWorkspaceRole(client: SupabaseClient, workspaceId: string): Promise<"owner" | "editor" | "viewer" | null> {
  const { data, error } = await client.rpc("workspace_role", { ws_id: workspaceId });
  if (error || (data !== "owner" && data !== "editor" && data !== "viewer")) return null;
  return data;
}

export const canWriteRole = (role: string | null) => role === "owner" || role === "editor";

/** Premier espace (propriétaire en priorité) où l'utilisateur peut écrire ; aucun espace créé automatiquement. */
export async function pickWritableWorkspace(client: SupabaseClient, workspaceIds: string[]): Promise<string | null> {
  const roles = await Promise.all(workspaceIds.map(async (id) => [id, await getWorkspaceRole(client, id)] as const));
  return roles.find(([, r]) => r === "owner")?.[0] ?? roles.find(([, r]) => r === "editor")?.[0] ?? null;
}

export interface CreateProjectInput {
  workspaceId: string;
  authUserId: string;
  name: string;
  objective: string;
  projectManager?: string;
  /** AAAA-MM-JJ */
  dueDate?: string;
}

export async function createProjectWithObjective(deps: WriteDeps, input: CreateProjectInput): Promise<WriteResult<{ projectId: string }>> {
  const name = input.name.trim();
  const objective = input.objective.trim();
  if (!name || name.length > LIMITS.name) return fail("invalid", "Nom du projet requis (90 caractères max).");
  if (!objective || objective.length > LIMITS.objective) return fail("invalid", "Objectif requis (240 caractères max).");
  const now = clock(deps)();
  const newId = ids(deps);

  const project = createProject({
    id: newId(),
    workspaceId: input.workspaceId,
    name,
    method: V3_DEFAULTS.projectMethod,
    criticality: V3_DEFAULTS.projectCriticality,
    now,
    projectManager: input.projectManager?.trim() || undefined,
    targetDate: input.dueDate ? `${input.dueDate}T12:00:00.000Z` : undefined,
  });
  if (!project.ok) return fail("invalid", project.error.message);
  const created = await createProjectRow(deps.client, project.state);
  if (!created.ok) return fromPersistence(created.error);

  const obj = createObjective({ id: newId(), projectId: project.state.id, statement: objective, now, ownerId: input.authUserId });
  if (!obj.ok) return fail("invalid", obj.error.message);
  const objResult = await createObjectiveRow(deps.client, obj.state, input.workspaceId);
  if (!objResult.ok) {
    // Compensation : jamais un projet orphelin sans objectif après un échec partiel.
    await deps.client.from("projets_v3_projects").delete().eq("id", project.state.id);
    return fromPersistence(objResult.error);
  }
  return { ok: true, value: { projectId: project.state.id } };
}

export interface AddActionInput {
  projectId: string;
  authUserId: string;
  title: string;
  /** AAAA-MM-JJ */
  dueDate?: string;
}

/** Crée l'action directement « En cours » (invariants Prêt/En cours vérifiés par le domaine, un seul INSERT). */
export async function addWorkItem(deps: WriteDeps, input: AddActionInput): Promise<WriteResult<{ workItemId: string }>> {
  const title = input.title.trim();
  if (!title || title.length > LIMITS.action) return fail("invalid", "Action requise (160 caractères max).");
  const project = await findProjectById(deps.client, input.projectId);
  if (!project.ok) return fromPersistence(project.error);
  if (!project.value) return fail("not_found", "Projet introuvable ou inaccessible.");
  const now = clock(deps)();

  const draft = createWorkItem({
    id: ids(deps)(),
    projectId: input.projectId,
    type: V3_DEFAULTS.workItemType,
    title,
    priority: V3_DEFAULTS.workItemPriority,
    now,
    responsibleId: input.authUserId,
    dueDate: input.dueDate ? `${input.dueDate}T12:00:00.000Z` : undefined,
    exitCondition: input.dueDate ? undefined : V3_DEFAULTS.exitCondition,
  });
  if (!draft.ok) return fail("invalid", draft.error.message);
  const ready = transitionWorkItem(draft.state, "ready", now);
  if (!ready.ok) return fail("invalid", ready.error.message);
  const running = transitionWorkItem(ready.state, "in_progress", now);
  if (!running.ok) return fail("invalid", running.error.message);

  const saved = await createWorkItemRow(deps.client, running.state, project.value.workspaceId);
  if (!saved.ok) return fromPersistence(saved.error);
  return { ok: true, value: { workItemId: saved.value.id } };
}

const COMPLETABLE: WorkItemStatus[] = ["in_progress", "validation"];

/** Terminer = En cours → Validation → Terminé (deux écritures à concurrence optimiste) ; reprise possible depuis Validation. */
export async function completeWorkItem(deps: WriteDeps, workItemId: string): Promise<WriteResult<{ status: WorkItemStatus }>> {
  const found = await findWorkItemById(deps.client, workItemId);
  if (!found.ok) return fromPersistence(found.error);
  if (!found.value) return fail("not_found", "Action introuvable ou inaccessible.");
  let item: WorkItem = found.value;
  if (!COMPLETABLE.includes(item.status)) return fail("not_completable", "Cette action ne peut pas être terminée depuis son état actuel.");
  const project = await findProjectById(deps.client, item.projectId);
  if (!project.ok) return fromPersistence(project.error);
  if (!project.value) return fail("not_found", "Projet introuvable ou inaccessible.");

  const steps: WorkItemStatus[] = item.status === "in_progress" ? ["validation", "done"] : ["done"];
  for (const to of steps) {
    const next = transitionWorkItem(item, to, clock(deps)());
    if (!next.ok) return fail("invalid", next.error.message);
    const saved = await updateWorkItemRow(deps.client, next.state, project.value.workspaceId, item.updatedAt);
    if (!saved.ok) return fromPersistence(saved.error);
    item = saved.value;
  }
  return { ok: true, value: { status: item.status } };
}
