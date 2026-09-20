import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";

/** Même contrat que brief-labels.ts/home-overview-labels.ts — jamais
 * error.message affiché tel quel. */
export function projectsListErrorToUserMessage(error: PersistenceError): string {
  if (error.kind === "persistence" && error.code === "not_found") {
    return "Aucun projet disponible pour le moment.";
  }
  return "Impossible de charger tes projets.";
}
