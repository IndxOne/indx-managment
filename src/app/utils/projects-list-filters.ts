import type { ProjectsListItem } from "../../domain/v3/projects-list/types";

export type ProjectsFilterId = "active" | "at_risk" | "closed";

/**
 * Groupement pur sur ProjectStatus (enum déjà existant) — aucune nouvelle
 * règle métier, juste une lecture différente du même champ (gate UX-3 §7).
 * Filtrage en mémoire sur la projection déjà chargée, jamais une requête
 * réseau par changement d'onglet.
 */
export const PROJECTS_LIST_FILTERS: {
  id: ProjectsFilterId;
  label: string;
  select: (items: ProjectsListItem[]) => ProjectsListItem[];
}[] = [
  { id: "active", label: "Actifs", select: (items) => items.filter((p) => p.status !== "closed") },
  {
    id: "at_risk",
    label: "À risque",
    select: (items) => items.filter((p) => p.status === "at_risk" || p.status === "off_track"),
  },
  { id: "closed", label: "Clôturés", select: (items) => items.filter((p) => p.status === "closed") },
];
