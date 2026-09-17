import { deriveScheduleKeys } from "../../calendar/calendar-engine";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { computeWorkspaceSummary } from "./workspace-summary";
import { deriveHomeBuckets } from "./home-buckets";

export interface ActiveProjectSummary {
  workspace: Workspace;
  totalCount: number;
  doneCount: number;
}

export interface TodayOverview {
  /** Action unique la plus urgente, tous espaces confondus (RUN ou PROJET) — jamais dupliquée dans les autres sections. */
  priorityAction: Action | null;
  /** Quelques actions RUN nécessitant une action aujourd'hui (en retard ou du jour), hors priorité immédiate. */
  runToday: Action[];
  /** Tâches PROJET du jour, à travers différents projets, hors priorité immédiate. */
  projectTasksToday: Action[];
  /** Prochaine échéance importante (hors aujourd'hui/priorité déjà montrées). */
  nextDeadline: Action | null;
  /** Vue secondaire compacte des espaces PROJET actifs (au moins une action). */
  activeProjects: ActiveProjectSummary[];
}

const MAX_SECTION_ITEMS = 5;

function firstHighPriorityOrFirst(list: readonly Action[]): Action | undefined {
  return list.find((action) => action.priority === "high") ?? list[0];
}

/**
 * Sélecteurs "Aujourd'hui" (Lot A du renouveau mobile) : construits
 * uniquement sur `deriveHomeBuckets`/`deriveScheduleKeys` déjà en place
 * (aucun second moteur temporel). Aucun chiffre n'est jamais inventé : tout
 * vient des actions/espaces réels passés en argument.
 *
 * "Priorité immédiate" : en retard (priorité haute d'abord) > bloqué
 * (priorité haute d'abord) > du jour (priorité haute d'abord) — la première
 * action non vide de cet ordre gagne. Les autres sections excluent
 * systématiquement cette action pour ne jamais la montrer deux fois.
 */
export function deriveTodayOverview(
  workspaces: readonly Workspace[],
  actionsByWorkspace: Record<string, Action[] | undefined>,
  timezone: string,
  now: Date = new Date()
): TodayOverview {
  const kindByWorkspaceId = new Map(workspaces.map((workspace) => [workspace.id, workspace.kind]));
  const allActions = workspaces.flatMap((workspace) => actionsByWorkspace[workspace.id] ?? []);
  const buckets = deriveHomeBuckets(allActions, timezone, now);

  const priorityAction =
    firstHighPriorityOrFirst(buckets.overdue) ??
    firstHighPriorityOrFirst(buckets.blocked) ??
    firstHighPriorityOrFirst(buckets.today) ??
    null;

  const excludeId = priorityAction?.id;
  const dueTodayOrLate = [...buckets.overdue, ...buckets.blocked, ...buckets.today].filter(
    (action) => action.id !== excludeId
  );

  const runToday = dueTodayOrLate
    .filter((action) => kindByWorkspaceId.get(action.workspaceId) === "run")
    .slice(0, MAX_SECTION_ITEMS);

  const projectTasksToday = dueTodayOrLate
    .filter((action) => kindByWorkspaceId.get(action.workspaceId) === "project")
    .slice(0, MAX_SECTION_ITEMS);

  const upcoming = buckets.thisWeekPreview
    .filter((action) => action.id !== excludeId)
    .map((action) => ({ action, dayKey: deriveScheduleKeys(action.schedule, timezone, now).dayKey }))
    .filter((entry): entry is { action: Action; dayKey: string } => Boolean(entry.dayKey))
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
  const nextDeadline = upcoming[0]?.action ?? null;

  const activeProjects: ActiveProjectSummary[] = workspaces
    .filter((workspace) => workspace.kind === "project")
    .map((workspace) => {
      const actions = actionsByWorkspace[workspace.id] ?? [];
      const summary = computeWorkspaceSummary(actions, timezone, now);
      return { workspace, totalCount: actions.length, doneCount: summary.doneCount };
    })
    .filter((entry) => entry.totalCount > 0);

  return { priorityAction, runToday, projectTasksToday, nextDeadline, activeProjects };
}
