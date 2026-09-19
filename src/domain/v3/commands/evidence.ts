import type { Evidence, EvidenceType, EntityId, IsoDateTime } from "../types";
import type { DomainEvent } from "../events";
import { domainError } from "../errors";
import { ok, fail, type CommandResult } from "../result";

export interface AttachEvidenceInput {
  id: EntityId;
  projectId: EntityId;
  provedEntityType: Evidence["provedEntityType"];
  provedEntityId: EntityId;
  type: EvidenceType;
  description: string;
  now: IsoDateTime;
  source?: string;
  authorId?: EntityId;
}

export function attachEvidence(input: AttachEvidenceInput): CommandResult<Evidence> {
  if (!input.description) {
    return fail(domainError("evidence_missing_description", "Une description est requise pour une preuve"));
  }
  const evidence: Evidence = {
    id: input.id,
    projectId: input.projectId,
    provedEntityType: input.provedEntityType,
    provedEntityId: input.provedEntityId,
    type: input.type,
    description: input.description,
    source: input.source,
    authorId: input.authorId,
    validationStatus: "pending",
    createdAt: input.now,
  };
  const events: DomainEvent[] = [
    { type: "evidence.attached", occurredAt: input.now, projectId: evidence.projectId, payload: { evidenceId: evidence.id, provedEntityId: evidence.provedEntityId } },
  ];
  return ok(evidence, events);
}

export function validateEvidence(evidence: Evidence, accepted: boolean, now: IsoDateTime): CommandResult<Evidence> {
  const next: Evidence = { ...evidence, validationStatus: accepted ? "validated" : "rejected" };
  const events: DomainEvent[] = [
    { type: "evidence.validated", occurredAt: now, projectId: evidence.projectId, payload: { evidenceId: evidence.id } },
  ];
  return ok(next, events);
}
