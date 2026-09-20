import type { ObjectiveOverviewItem } from "../../../domain/v3/project-overview/types";
import { OBJECTIVE_STATUS_LABELS } from "../../utils/project-overview-labels";

/** Aucune édition dans ce lot (gate §8) — présentation seule. hasOwner ne
 * révèle jamais d'identité brute (gate §7 du correctif) : simple mention
 * "Propriétaire assigné", jamais l'UUID. */
export function ObjectiveCard({ objective }: { objective: ObjectiveOverviewItem }) {
  return (
    <div className="brief-item-card" style={{ borderLeftColor: "var(--color-border)" }}>
      <div className="brief-item-card-header">
        <span className="meta-chip">{OBJECTIVE_STATUS_LABELS[objective.status]}</span>
      </div>
      <p className="brief-item-card-title">{objective.statement}</p>
      {objective.expectedValue && <p className="brief-item-card-reason">{objective.expectedValue}</p>}
      {objective.hasOwner && <p className="brief-item-card-meta">Propriétaire assigné</p>}
    </div>
  );
}
