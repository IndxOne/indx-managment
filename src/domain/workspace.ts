import { isKnownApproach } from "../presets/preset-registry";
import type { CollaborationMode, ProfessionalApproach, WorkspaceKind } from "./types";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  kind: WorkspaceKind;
  approach: ProfessionalApproach;
  collaborationMode: CollaborationMode;
  presetVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  id: string;
  name: string;
  description?: string;
  kind: WorkspaceKind;
  approach?: ProfessionalApproach;
  collaborationMode?: CollaborationMode;
  /** Instant ISO injectable pour les tests ; par défaut l'heure courante. */
  now?: string;
}

const DEFAULT_APPROACH_BY_KIND: Record<WorkspaceKind, ProfessionalApproach> = {
  run: "it_ops",
  project: "project_amoa",
};

const CURRENT_PRESET_VERSION = 1;

export function createWorkspace(input: CreateWorkspaceInput): Workspace {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Le nom de l'espace est requis");
  }
  const approach = input.approach ?? DEFAULT_APPROACH_BY_KIND[input.kind];
  assertKnownApproach(approach);
  const timestamp = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    name,
    description: input.description,
    kind: input.kind,
    approach,
    collaborationMode: input.collaborationMode ?? "solo",
    presetVersion: CURRENT_PRESET_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Change uniquement `approach` (+ `updatedAt`). Ne touche à aucune action :
 * la garantie "changer d'approche ne modifie aucune action" vient du fait
 * que cette fonction ne connaît même pas les actions (agrégats séparés).
 */
export function changeWorkspaceApproach(
  workspace: Workspace,
  approach: ProfessionalApproach,
  now?: string
): Workspace {
  assertKnownApproach(approach);
  if (approach === workspace.approach) {
    return workspace;
  }
  return {
    ...workspace,
    approach,
    updatedAt: now ?? new Date().toISOString(),
  };
}

function assertKnownApproach(approach: string): asserts approach is ProfessionalApproach {
  if (!isKnownApproach(approach)) {
    throw new Error(`Approche métier inconnue : ${approach}`);
  }
}
