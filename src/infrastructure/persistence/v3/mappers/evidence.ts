import type { Evidence } from "../../../../domain/v3/types";

/** Pas de updated_at : le domaine n'en porte pas non plus (validateEvidence
 * mute validationStatus sans horodatage dédié). Même limitation que Stage. */
export interface EvidenceRow {
  id: string;
  project_id: string;
  workspace_id: string;
  proved_entity_type: string;
  proved_entity_id: string;
  type: string;
  description: string;
  source: string | null;
  author_id: string | null;
  validation_status: string;
  created_at: string;
}

export function evidenceFromRow(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    projectId: row.project_id,
    provedEntityType: row.proved_entity_type as Evidence["provedEntityType"],
    provedEntityId: row.proved_entity_id,
    type: row.type as Evidence["type"],
    description: row.description,
    source: row.source ?? undefined,
    authorId: row.author_id ?? undefined,
    validationStatus: row.validation_status as Evidence["validationStatus"],
    createdAt: row.created_at,
  };
}

export function evidenceToRow(evidence: Evidence, workspaceId: string): EvidenceRow {
  return {
    id: evidence.id,
    project_id: evidence.projectId,
    workspace_id: workspaceId,
    proved_entity_type: evidence.provedEntityType,
    proved_entity_id: evidence.provedEntityId,
    type: evidence.type,
    description: evidence.description,
    source: evidence.source ?? null,
    author_id: evidence.authorId ?? null,
    validation_status: evidence.validationStatus,
    created_at: evidence.createdAt,
  };
}
