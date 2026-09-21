import type { SupabaseClient } from "@supabase/supabase-js";
import type { IsoDateTime, Project } from "../../../../domain/v3/types";
import type { HomeOverviewProjection } from "../../../../domain/v3/home/types";
import { buildHomeOverview } from "../../../../domain/v3/home/build-home-overview";
import { projectFromRow, type ProjectRow } from "../mappers/project";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { fetchBriefsAndMilestones } from "./shared-brief-fetch";

const PROJECT_TABLE = "projets_v3_projects";

/** ≤5 projets (gate §4) : borne le nombre de lignes de la 1ʳᵉ requête, ce
 * qui borne à son tour la taille des 8 requêtes batchées `.in()` suivantes —
 * c'est ce qui garantit le budget fixe de requêtes, pas un filtre après coup. */
const MAX_PROJECTS = 5;

/**
 * Liste courte des projets affichés en Home — non clôturés, les plus
 * récemment mis à jour d'abord. Réutilise projectFromRow (aucun second
 * mapper) : les colonnes chargées sont les mêmes que fetchProject() dans
 * brief-reader.ts, seul le filtre/tri/limite diffère.
 */
async function listHomeProjects(client: SupabaseClient): Promise<PersistenceResult<Project[]>> {
  const { data, error } = await client
    .from(PROJECT_TABLE)
    .select()
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(MAX_PROJECTS);
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []).map((row) => projectFromRow(row as ProjectRow, [])));
}

/**
 * Lecteur infrastructure de Home V3 (Lot UX-2, gate validée). Budget fixe :
 * 1 requête (liste des projets, bornée à 5) + 8 requêtes batchées en
 * parallèle (`fetchBriefsAndMilestones`, factorisée avec le reader Projets
 * V3 — UX-3) = 9 requêtes au total, quel que soit le nombre de projets
 * réels du compte — jamais readProjectOverview()/readBrief() appelé en
 * boucle. buildBrief() est appelé une fois par projet chargé, en mémoire,
 * sans requête supplémentaire — aucune règle métier réécrite, seulement la
 * même fonction que Mon Brief, réutilisée telle quelle.
 */
export async function readHomeOverview(client: SupabaseClient, now: IsoDateTime): Promise<PersistenceResult<HomeOverviewProjection>> {
  const projectsResult = await listHomeProjects(client);
  if (!projectsResult.ok) return projectsResult;
  const projects = projectsResult.value;

  if (projects.length === 0) {
    return okResult({ generatedAt: now, attentionItems: [], projects: [] });
  }

  const fetched = await fetchBriefsAndMilestones(client, projects, now);
  if (!fetched.ok) return fetched;

  const overview = buildHomeOverview({
    now,
    projects,
    briefsByProjectId: fetched.value.briefsByProjectId,
    milestonesByProjectId: fetched.value.milestonesByProjectId,
  });
  return okResult(overview);
}
