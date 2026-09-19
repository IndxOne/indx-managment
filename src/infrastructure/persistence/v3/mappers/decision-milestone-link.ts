/** projets_v3_decision_milestones — table de jonction pure, pas d'entité
 * domaine correspondante. Porte Decision.impactedMilestoneIds. */
export interface DecisionMilestoneLinkRow {
  decision_id: string;
  milestone_id: string;
  project_id: string;
  workspace_id: string;
  created_at: string;
}

export function decisionMilestoneLinkToRow(
  decisionId: string,
  milestoneId: string,
  projectId: string,
  workspaceId: string
): Omit<DecisionMilestoneLinkRow, "created_at"> {
  return { decision_id: decisionId, milestone_id: milestoneId, project_id: projectId, workspace_id: workspaceId };
}
