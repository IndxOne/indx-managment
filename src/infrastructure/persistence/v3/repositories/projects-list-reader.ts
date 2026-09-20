import type { SupabaseClient } from "@supabase/supabase-js";
import type { IsoDateTime } from "../../../../domain/v3/types";
import type { ProjectsListProjection } from "../../../../domain/v3/projects-list/types";
import { buildProjectsList } from "../../../../domain/v3/projects-list/build-projects-list";
import { projectFromRow, type ProjectRow } from "../mappers/project";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";
import { fetchBriefsAndMilestones } from "./shared-brief-fetch";

const PROJECT_TABLE = "projets_v3_projects";

/**
 * Lecteur infrastructure de l'écran Projets V3 (Lot UX-3, gate validée).
 * Budget fixe : 1 requête (tous les projets accessibles, RLS déjà
 * restrictive — pas de statut filtré côté SQL : les onglets Actifs/À
 * risque/Clôturés filtrent en mémoire sur la projection déjà chargée,
 * jamais une nouvelle requête par changement de filtre) + les mêmes 8
 * requêtes batchées que Home (`fetchBriefsAndMilestones`, factorisée) = 9
 * requêtes au total, quel que soit le nombre de projets réels du compte.
 *
 * Contrairement à Home, aucune limite artificielle sur le nombre de
 * projets listés (correction de gate explicite : pas de `limit()` silencieux
 * non justifié) — l'écran doit lister TOUS les Project V3 accessibles.
 */
export async function readProjectsList(client: SupabaseClient, now: IsoDateTime): Promise<PersistenceResult<ProjectsListProjection>> {
  const { data, error } = await client.from(PROJECT_TABLE).select().order("updated_at", { ascending: false });
  if (error) return failResult(fromPostgrestError(error));
  const projects = (data ?? []).map((row) => projectFromRow(row as ProjectRow, []));

  if (projects.length === 0) {
    return okResult({ generatedAt: now, projects: [] });
  }

  const fetched = await fetchBriefsAndMilestones(client, projects, now);
  if (!fetched.ok) return fetched;

  const projection = buildProjectsList({
    now,
    projects,
    briefsByProjectId: fetched.value.briefsByProjectId,
    milestonesByProjectId: fetched.value.milestonesByProjectId,
  });
  return okResult(projection);
}
