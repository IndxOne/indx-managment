import type { Risk } from "../../../../domain/v3/types";

export interface RiskRow {
  id: string;
  project_id: string;
  workspace_id: string;
  event: string;
  cause: string | null;
  consequence: string | null;
  probability: string | null;
  impact: string | null;
  criticality: string | null;
  strategy: string | null;
  response: string | null;
  owner_id: string | null;
  trigger: string | null;
  review_date: string | null;
  residual_risk: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function riskFromRow(row: RiskRow): Risk {
  return {
    id: row.id,
    projectId: row.project_id,
    event: row.event,
    cause: row.cause ?? undefined,
    consequence: row.consequence ?? undefined,
    probability: (row.probability as Risk["probability"]) ?? undefined,
    impact: (row.impact as Risk["impact"]) ?? undefined,
    criticality: (row.criticality as Risk["criticality"]) ?? undefined,
    strategy: (row.strategy as Risk["strategy"]) ?? undefined,
    response: row.response ?? undefined,
    ownerId: row.owner_id ?? undefined,
    trigger: row.trigger ?? undefined,
    reviewDate: row.review_date ?? undefined,
    residualRisk: row.residual_risk ?? undefined,
    status: row.status as Risk["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function riskToRow(risk: Risk, workspaceId: string): RiskRow {
  return {
    id: risk.id,
    project_id: risk.projectId,
    workspace_id: workspaceId,
    event: risk.event,
    cause: risk.cause ?? null,
    consequence: risk.consequence ?? null,
    probability: risk.probability ?? null,
    impact: risk.impact ?? null,
    criticality: risk.criticality ?? null,
    strategy: risk.strategy ?? null,
    response: risk.response ?? null,
    owner_id: risk.ownerId ?? null,
    trigger: risk.trigger ?? null,
    review_date: risk.reviewDate ?? null,
    residual_risk: risk.residualRisk ?? null,
    status: risk.status,
    created_at: risk.createdAt,
    updated_at: risk.updatedAt,
  };
}
