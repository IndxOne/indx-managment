import { forwardRef } from "react";
import type { ObjectiveOverviewItem } from "../../../domain/v3/project-overview/types";
import { OBJECTIVE_STATUS_LABELS } from "../../utils/project-overview-labels";

/** Aucune édition dans ce lot (gate §8) — présentation seule. hasOwner ne
 * révèle jamais d'identité brute (gate §7 du correctif) : simple mention
 * "Propriétaire assigné", jamais l'UUID. `focused`/ref (UX-5.3, correctif
 * review Codex) : un Objectif ciblé par "Changé récemment" doit pouvoir
 * être surligné/scrollé comme les autres catégories Explorer. */
export const ObjectiveCard = forwardRef<HTMLDivElement, { objective: ObjectiveOverviewItem; focused?: boolean }>(
  function ObjectiveCard({ objective, focused }, ref) {
    return (
      <div ref={ref} className="brief-item-card" data-focused={focused ? "true" : undefined} style={{ borderLeftColor: "var(--color-border)" }}>
        <div className="brief-item-card-header">
          <span className="meta-chip">{OBJECTIVE_STATUS_LABELS[objective.status]}</span>
        </div>
        <p className="brief-item-card-title">{objective.statement}</p>
        {objective.expectedValue && <p className="brief-item-card-reason">{objective.expectedValue}</p>}
        {objective.hasOwner && <p className="brief-item-card-meta">Propriétaire assigné</p>}
      </div>
    );
  }
);
