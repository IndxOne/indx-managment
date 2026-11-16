import type { SupabaseClient } from "@supabase/supabase-js";
import { failResult, okResult, type PersistenceResult } from "../../infrastructure/persistence/v3/errors";
import { objectiveFromRow, type ObjectiveRow } from "../../infrastructure/persistence/v3/mappers/objective";
import { projectFromRow, type ProjectRow } from "../../infrastructure/persistence/v3/mappers/project";
import { workItemFromRow, type WorkItemRow } from "../../infrastructure/persistence/v3/mappers/work-item";
import { fetchAllRows } from "../../infrastructure/persistence/v3/repositories/pagination";
import { buildMinimalProjects, type MinimalProjectCard } from "./build-minimal-projects";

/** Lecture seule : 3 requêtes paginées (projets, objectifs, actions) filtrées par la RLS existante. */
export async function readMinimalProjects(client: SupabaseClient): Promise<PersistenceResult<MinimalProjectCard[]>> {
  const [projects, objectives, workItems] = await Promise.all([
    fetchAllRows<ProjectRow>((from, to) => client.from("projets_v3_projects").select().order("id").range(from, to)),
    fetchAllRows<ObjectiveRow>((from, to) => client.from("projets_v3_objectives").select().order("id").range(from, to)),
    fetchAllRows<WorkItemRow>((from, to) => client.from("projets_v3_work_items").select().order("id").range(from, to)),
  ]);
  if (!projects.ok) return failResult(projects.error);
  if (!objectives.ok) return failResult(objectives.error);
  if (!workItems.ok) return failResult(workItems.error);
  return okResult(
    buildMinimalProjects({
      projects: projects.value.map((r) => projectFromRow(r, [])),
      objectives: objectives.value.map(objectiveFromRow),
      workItems: workItems.value.map((r) => workItemFromRow(r, [], [])),
    })
  );
}
