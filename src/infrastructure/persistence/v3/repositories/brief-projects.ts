import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityId, ProjectStatus } from "../../../../domain/v3/types";
import { failResult, fromPostgrestError, okResult, type PersistenceResult } from "../errors";

const PROJECT_TABLE = "projets_v3_projects";

/** Champs strictement nécessaires au launcher Mon Brief — jamais l'entité
 * Project complète, jamais d'entité fille chargée. */
export interface BriefProjectSummary {
  id: EntityId;
  name: string;
  status: ProjectStatus;
}

/**
 * Liste les projets V3 visibles par l'utilisateur courant — aucun filtre
 * explicite : la RLS existante sur projets_v3_projects (workspace_role(...)
 * is not null) fait déjà tout le travail de contrôle d'accès. Aucun
 * service_role, aucune entité fille chargée (pas de mapper domaine ici :
 * ce n'est pas une entité Project reconstruite, juste un résumé
 * d'affichage pour le launcher).
 */
export async function listBriefProjects(client: SupabaseClient): Promise<PersistenceResult<BriefProjectSummary[]>> {
  const { data, error } = await client.from(PROJECT_TABLE).select("id, name, status");
  if (error) return failResult(fromPostgrestError(error));
  return okResult((data ?? []) as BriefProjectSummary[]);
}
