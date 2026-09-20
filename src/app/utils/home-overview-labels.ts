import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";

/**
 * Traduit une erreur d'infrastructure en message utilisateur déterministe —
 * même contrat que brief-labels.ts/project-overview-labels.ts (jamais
 * error.message affiché tel quel).
 */
export function homeOverviewErrorToUserMessage(error: PersistenceError): string {
  if (error.kind === "persistence" && error.code === "not_found") {
    return "Aucun projet disponible pour le moment.";
  }
  return "Impossible de charger tes projets.";
}
