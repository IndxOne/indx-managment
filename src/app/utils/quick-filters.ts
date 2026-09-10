import type { ActionFilters } from "./filter-actions";

export interface QuickFilter {
  id: string;
  label: string;
  isActive: (filters: ActionFilters) => boolean;
  apply: (filters: ActionFilters) => ActionFilters;
}

function toggleSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Sous-ensemble de PRESET_REGISTRY[...].quickFilters qui a un champ réel
 * derrière (statut/priorité/type d'action). Ignorés ici faute de donnée :
 * "technicalDebt", "byAssignee", "blocked" (pas d'assigné ni de flag dette
 * dans le modèle — cf. cadrage §5). Ignorés aussi car redondants avec un
 * sélecteur de vue déjà affiché : "today"/"thisWeek" (Aujourd'hui/Semaine),
 * "currentPhase" (onglets de phase du Kanban PROJET).
 */
const QUICK_FILTERS: Record<string, QuickFilter> = {
  done: {
    id: "done",
    label: "Terminées",
    isActive: (f) => f.statuses.has("done"),
    apply: (f) => ({ ...f, statuses: toggleSet(f.statuses, "done") }),
  },
  waiting: {
    id: "waiting",
    label: "En attente",
    isActive: (f) => f.statuses.has("waiting"),
    apply: (f) => ({ ...f, statuses: toggleSet(f.statuses, "waiting") }),
  },
  highPriority: {
    id: "highPriority",
    label: "Prioritaires",
    isActive: (f) => f.priorities.has("high"),
    apply: (f) => ({ ...f, priorities: toggleSet(f.priorities, "high") }),
  },
  milestonesOnly: {
    id: "milestonesOnly",
    label: "Jalons",
    isActive: (f) => f.itemTypes.has("milestone"),
    apply: (f) => ({ ...f, itemTypes: toggleSet(f.itemTypes, "milestone") }),
  },
  backlog: {
    id: "backlog",
    label: "Backlog",
    isActive: (f) => f.statuses.has("todo"),
    apply: (f) => ({ ...f, statuses: toggleSet(f.statuses, "todo") }),
  },
  inReview: {
    id: "inReview",
    label: "En revue",
    isActive: (f) => f.statuses.has("waiting"),
    apply: (f) => ({ ...f, statuses: toggleSet(f.statuses, "waiting") }),
  },
};

export function resolveQuickFilters(ids: readonly string[]): QuickFilter[] {
  return ids.flatMap((id) => (QUICK_FILTERS[id] ? [QUICK_FILTERS[id]] : []));
}
