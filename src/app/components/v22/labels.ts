import type { Tone } from "../../utils/tone";

export const WORK_STATUS_LABELS: Record<string, string> = {
  to_scope: "À cadrer",
  ready: "Prêt",
  in_progress: "En cours",
  blocked: "Bloqué",
  validation: "En validation",
  done: "Terminé",
  cancelled: "Annulé",
  waiting_external: "En attente externe",
};
export const PRIORITY_LABELS: Record<string, string> = { high: "Priorité haute", normal: "Priorité normale", low: "Priorité basse" };
export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  planned: "Prévu",
  ready_for_review: "À valider",
  accepted: "Accepté",
  refused: "Refusé",
};
export const DECISION_STATUS_LABELS: Record<string, string> = {
  to_prepare: "À préparer",
  ready: "Prête",
  decided: "Décidée",
  applied: "Appliquée",
  verified: "Vérifiée",
};

export function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key.replace(/_/g, " ");
}

export function workStatusTone(status: string): Tone {
  if (status === "blocked") return "critical";
  if (status === "waiting_external") return "attention";
  if (status === "done") return "positive";
  return "neutral";
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
