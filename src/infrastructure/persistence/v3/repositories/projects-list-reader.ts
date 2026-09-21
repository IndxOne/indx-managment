import type { SupabaseClient } from "@supabase/supabase-js";
import type { IsoDateTime } from "../../../../domain/v3/types";
import type { ProjectsListProjection } from "../../../../domain/v3/projects-list/types";
import { buildProjectsList } from "../../../../domain/v3/projects-list/build-projects-list";
import { projectFromRow, type ProjectRow } from "../mappers/project";
import { okResult, type PersistenceResult } from "../errors";
import { fetchAllRows } from "./pagination";
import { fetchBriefsAndMilestones } from "./shared-brief-fetch";

const PROJECT_TABLE = "projets_v3_projects";

/**
 * Lecteur infrastructure de l'écran Projets V3 (Lot UX-3, gate validée).
 * Budget : 1+ requêtes pour la liste des projets (paginée, cap PostgREST
 * 1000 lignes/page — voir pagination.ts) + les mêmes 8 requêtes batchées que
 * Home (`fetchBriefsAndMilestones`, factorisée), elles-mêmes paginées par
 * collection. En dessous de 1000 projets/lignes (cas réel actuel), c'est
 * toujours exactement 9 requêtes.
 *
 * Aucun statut filtré côté SQL : les onglets Actifs/À risque/Clôturés
 * filtrent en mémoire sur la projection déjà chargée, jamais une nouvelle
 * requête par changement de filtre. Contrairement à Home, aucune limite
 * artificielle sur le nombre de projets listés (correction de gate
 * explicite : pas de `limit()` silencieux non justifié) — l'écran doit
 * lister TOUS les Project V3 accessibles, quel que soit leur nombre.
 *
 * Tri `updated_at desc` avec `id asc` en tie-break déterministe : sans lui,
 * deux projets à la même seconde n'auraient aucun ordre stable entre deux
 * pages `.range()`, au risque de dupliquer ou sauter une ligne.
 */
export async function readProjectsList(client: SupabaseClient, now: IsoDateTime): Promise<PersistenceResult<ProjectsListProjection>> {
  const projectsResult = await fetchAllRows<ProjectRow>((from, to) =>
    client
      .from(PROJECT_TABLE)
      .select()
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
  );
  if (!projectsResult.ok) return projectsResult;
  const projects = projectsResult.value.map((row) => projectFromRow(row, []));

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
