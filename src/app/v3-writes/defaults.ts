/** Repli : VITE_UX_MINIMAL=off restaure l'écran Projet historique. */
export function isUxMinimalEnabled(): boolean {
  return import.meta.env.VITE_UX_MINIMAL !== "off";
}

/** Interrupteur de repli : VITE_UX_V3_WRITES=off masque toute écriture V3 (lecture seule). */
export function isV3WritesEnabled(): boolean {
  return import.meta.env.VITE_UX_V3_WRITES !== "off";
}

/**
 * Valeurs par défaut métier des gestes minimaux (à valider par l'humain en recette) :
 * - projet : méthode « prédictif », criticité « moyenne » (aucun écart de règle déclenché) ;
 * - action : type « tâche », priorité « normale », responsable = l'utilisateur connecté (ACT-001, bloquante),
 *   condition de sortie « Action réalisée » si aucune échéance saisie (ACT-002, bloquante) ;
 * - objectif : propriétaire = l'utilisateur connecté.
 */
export const V3_DEFAULTS = {
  projectMethod: "predictive",
  projectCriticality: "medium",
  workItemType: "task",
  workItemPriority: "normal",
  exitCondition: "Action réalisée",
} as const;

export const LIMITS = { name: 90, objective: 240, action: 160 } as const;
