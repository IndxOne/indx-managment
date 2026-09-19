/**
 * Erreurs métier typées (cahier §16.2). Ces codes vivent au niveau des
 * INVARIANTS STRUCTURELS de chaque entité — distincts des codes de règle
 * du moteur de règles (ACT-001, DEC-001, RSK-001, JAL-001... §11.5, Lot 2)
 * qui, eux, observent des faits et produisent des recommandations/blocages
 * à un niveau supérieur. Conflater les deux couches ici créerait une
 * dépendance prématurée du domaine vers un moteur qui n'existe pas encore.
 */

export type DomainErrorCode =
  | "work_item_missing_responsible"
  | "work_item_missing_exit_condition"
  | "work_item_invalid_transition"
  | "work_item_blocked_without_reason"
  | "decision_missing_decider"
  | "decision_missing_due_date"
  | "decision_invalid_transition"
  | "decision_not_decided"
  | "risk_missing_assessment"
  | "risk_critical_without_owner"
  | "risk_critical_without_response"
  | "risk_invalid_transition"
  | "issue_missing_resolver"
  | "issue_invalid_transition"
  | "milestone_missing_criteria"
  | "milestone_missing_evidence"
  | "milestone_invalid_transition"
  | "dependency_missing_responsible"
  | "change_request_missing_impact_analysis"
  | "change_request_invalid_transition"
  | "evidence_missing_description";

export interface DomainError {
  code: DomainErrorCode;
  message: string;
  entityId?: string;
}

export function domainError(code: DomainErrorCode, message: string, entityId?: string): DomainError {
  return { code, message, entityId };
}
