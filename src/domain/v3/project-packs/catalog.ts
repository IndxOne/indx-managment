import type { ProjectPack } from "./types";

/**
 * Catalogue TypeScript statique et versionné (gate validée §8) : aucune
 * table DB, aucune administration. Chaque version publiée est immuable —
 * une évolution de contenu crée `<id>@<version+1>`, jamais une mutation
 * rétroactive d'une entrée existante (§7 de la gate).
 *
 * 4 packs initiaux uniquement (§6 du correctif) : le catalogue n'est pas la
 * bibliothèque finale (SI, migration, M365, applicatif, cyber... viendront
 * plus tard), seulement le mécanisme + un premier jeu représentatif.
 */
export const PROJECT_PACK_CATALOG: readonly ProjectPack[] = [
  {
    id: "standard-it-project",
    version: 1,
    name: "Projet SI standard",
    description: "Projet SI transverse classique : cadrage, conception, réalisation, recette, déploiement.",
    recommendedFor: "Développement ou intégration d'une solution SI transverse, méthode prédictive ou hybride.",
    method: "predictive",
    stages: [
      { name: "Cadrage", order: 0 },
      { name: "Conception", order: 1 },
      { name: "Réalisation", order: 2 },
      { name: "Recette", order: 3 },
      { name: "Déploiement", order: 4 },
    ],
    objectives: [{ statement: "Livrer le périmètre validé en cadrage, dans les délais et le budget approuvés" }],
    milestones: [
      { observableResult: "Cadrage validé (périmètre, budget, planning)", targetOffsetDays: 14, stageIndex: 0 },
      { observableResult: "Conception validée", targetOffsetDays: 45, stageIndex: 1 },
      { observableResult: "Recette utilisateur acceptée", targetOffsetDays: 90, stageIndex: 3 },
      { observableResult: "Déploiement en production réalisé", targetOffsetDays: 105, stageIndex: 4 },
    ],
  },
  {
    id: "migration",
    version: 1,
    name: "Migration",
    description: "Migration technique, applicative, télécom ou M365.",
    recommendedFor: "Bascule d'un existant vers une nouvelle plateforme/version, avec fenêtre de bascule identifiée.",
    method: "predictive",
    stages: [
      { name: "Audit de l'existant", order: 0 },
      { name: "Préparation", order: 1 },
      { name: "Bascule", order: 2 },
      { name: "Stabilisation", order: 3 },
    ],
    objectives: [{ statement: "Migrer sans interruption de service non planifiée, avec un existant intégralement repris" }],
    milestones: [
      { observableResult: "Cartographie de l'existant validée", targetOffsetDays: 10, stageIndex: 0 },
      { observableResult: "Plan de bascule et rollback validés", targetOffsetDays: 25, stageIndex: 1 },
      { observableResult: "Bascule réalisée", targetOffsetDays: 35, stageIndex: 2 },
      { observableResult: "Stabilisation confirmée (aucun incident bloquant)", targetOffsetDays: 49, stageIndex: 3 },
    ],
  },
  {
    id: "business-analysis",
    version: 1,
    name: "Cadrage métier / AMOA",
    description: "Cadrage métier, Business Analysis, AMOA en amont d'un projet SI.",
    recommendedFor: "Formalisation d'un besoin métier avant lancement d'un projet de réalisation.",
    method: "hybrid",
    stages: [
      { name: "Recueil du besoin", order: 0 },
      { name: "Analyse", order: 1 },
      { name: "Restitution", order: 2 },
    ],
    objectives: [{ statement: "Produire un dossier de cadrage exploitable pour lancer le projet suivant" }],
    milestones: [
      { observableResult: "Besoin formalisé et validé par le sponsor", targetOffsetDays: 10, stageIndex: 0 },
      { observableResult: "Dossier de cadrage restitué", targetOffsetDays: 21, stageIndex: 2 },
    ],
  },
  {
    id: "run-improvement",
    version: 1,
    name: "RUN / amélioration continue",
    description: "Exploitation courante (RUN) et amélioration continue d'un périmètre SI existant.",
    recommendedFor: "Suivi récurrent d'un périmètre déjà en production, sans projet de transformation en cours.",
    method: "run",
    // Aucun stage : RUN est continu, pas séquentiel (§6 du correctif de
    // gate) — un faux cycle "Cadrage → Déploiement" serait trompeur ici.
    stages: [],
    objectives: [{ statement: "Maintenir un niveau de service stable et réduire la dette identifiée sur le périmètre" }],
    milestones: [{ observableResult: "Première revue périodique réalisée", targetOffsetDays: 30 }],
  },
];

export function findProjectPack(id: string, version: number): ProjectPack | undefined {
  return PROJECT_PACK_CATALOG.find((pack) => pack.id === id && pack.version === version);
}
