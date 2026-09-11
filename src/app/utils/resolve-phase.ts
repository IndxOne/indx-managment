/**
 * Alias historiques → phase actuelle (Lot 6 §E). Deux générations de
 * legacy coexistent dans les données existantes :
 * - AMOA, 6 colonnes → 4 (avant ce lot) : ateliers/realisations/
 *   validations/restitutions/cloture ;
 * - preset "simple" (avant Lot 6) : phases qui dupliquaient le statut
 *   mot pour mot (à traiter/en cours/en attente/terminé).
 *
 * Jamais utilisé pour muter les données stockées — uniquement pour
 * résoudre, à l'affichage, l'équivalent le plus proche parmi les phases
 * actuelles de l'espace. `Action.phaseId` n'est jamais réécrit
 * silencieusement.
 */
export const LEGACY_PHASE_ALIASES: Record<string, string> = {
  ateliers: "conception",
  realisations: "realisation",
  validations: "deploiement",
  restitutions: "deploiement",
  cloture: "deploiement",
  a_traiter: "preparation",
  en_cours: "realisation",
  en_attente: "realisation",
  termine: "cloture",
};

/**
 * Résout la phase à afficher/regrouper pour une action : sa phase actuelle
 * si elle appartient encore au template courant, son équivalent legacy
 * sinon, ou la première phase du template à défaut des deux (jamais de
 * cul-de-sac visuel — cf. ProjectWorkspaceScreen).
 */
export function resolveDisplayPhaseId(phaseId: string | undefined, currentPhases: readonly string[]): string | undefined {
  if (!phaseId) return currentPhases[0];
  if (currentPhases.includes(phaseId)) return phaseId;
  return LEGACY_PHASE_ALIASES[phaseId] ?? currentPhases[0];
}
