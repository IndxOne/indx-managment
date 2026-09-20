import type { BriefSummary as BriefSummaryData } from "../../../domain/v3/brief/types";

/** 6 compteurs déjà calculés par le domaine Brief — aucun recalcul ici
 * (décision de gate §7). */
const ROWS: { key: keyof BriefSummaryData; label: string }[] = [
  { key: "blockingCount", label: "Bloquants" },
  { key: "warningCount", label: "Avertissements" },
  { key: "overdueCount", label: "Retards" },
  { key: "decisionsNeedingAttentionCount", label: "Décisions" },
  { key: "criticalRisksCount", label: "Risques" },
  { key: "milestonesNeedingAttentionCount", label: "Jalons" },
];

export function BriefSummary({ summary }: { summary: BriefSummaryData }) {
  return (
    <div className="brief-summary" role="group" aria-label="Résumé du Brief">
      {ROWS.map(({ key, label }) => (
        <div key={key} className="brief-summary-item">
          <span className="brief-summary-count">{summary[key]}</span>
          <span className="brief-summary-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
