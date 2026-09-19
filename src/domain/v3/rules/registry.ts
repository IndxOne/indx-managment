/**
 * Registre explicite (§6 de la gate) : aucune découverte dynamique, aucun
 * décorateur, aucun scan de fichiers. Une règle est active dès qu'elle est
 * déclarée dans le tableau de son domaine ci-dessous.
 */
import { workItemRules } from "./work-item-rules";
import { decisionRules } from "./decision-rules";
import { riskRules } from "./risk-rules";
import { issueRules } from "./issue-rules";
import { milestoneRules } from "./milestone-rules";
import { dependencyRules } from "./dependency-rules";
import { changeRequestRules } from "./change-request-rules";

export { workItemRules, decisionRules, riskRules, issueRules, milestoneRules, dependencyRules, changeRequestRules };

/** Liste plate, réservée à l'introspection/aux tests (unicité des ids,
 * cohérence targetType <-> tableau d'appartenance). Jamais utilisée pour
 * l'exécution (chaque evaluateXRules() n'exécute que son propre tableau). */
export const allRules = [
  ...workItemRules,
  ...decisionRules,
  ...riskRules,
  ...issueRules,
  ...milestoneRules,
  ...dependencyRules,
  ...changeRequestRules,
];
