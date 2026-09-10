import type { ProfessionalApproach } from "../../domain/types";
import { PRESET_REGISTRY } from "../../presets/preset-registry";
import { APPROACH_DESCRIPTIONS, APPROACH_LABELS, KIND_LABELS } from "../labels";
import { resolveQuickFilters } from "../utils/quick-filters";
import { MoreSubNav } from "../components/MoreSubNav";
import type { MoreDestination } from "../more-links";

const ALL_APPROACHES = Object.keys(PRESET_REGISTRY) as ProfessionalApproach[];

/**
 * Vue d'ensemble des approches métier disponibles : un même moteur d'espace,
 * plusieurs angles de lecture (champs visibles, filtres rapides). Purement
 * informatif — le choix ou changement d'approche se fait toujours depuis les
 * réglages d'un espace (ApproachSettingsScreen), pas depuis cet écran.
 */
export function ApproachesScreen({ onNavigate }: { onNavigate: (destination: MoreDestination) => void }) {
  return (
    <div>
      <div className="top-bar">
        <h1>Approches métier</h1>
      </div>
      <MoreSubNav active="roles" onNavigate={onNavigate} />
      <div className="app-main">
        <p className="action-sub" style={{ marginBottom: "var(--space-4)" }}>
          Un même moteur d'espace, plusieurs angles de lecture. Le choix se fait à la création d'un espace et reste
          modifiable à tout moment dans ses réglages.
        </p>

        <ul className="list approach-grid">
          {ALL_APPROACHES.map((id) => {
            const preset = PRESET_REGISTRY[id];
            const filters = resolveQuickFilters(preset.quickFilters);
            return (
              <li key={id} className="action-card" aria-labelledby={`role-${id}`}>
                <p className="action-sub" style={{ marginBottom: 2 }}>
                  {preset.allowedKinds.map((kind) => KIND_LABELS[kind]).join(" · ")}
                </p>
                <h2 id={`role-${id}`} style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  {APPROACH_LABELS[id]}
                </h2>
                <p className="action-sub">{APPROACH_DESCRIPTIONS[id]}</p>
                {filters.length > 0 && (
                  <div className="action-card-chips">
                    {filters.map((filter) => (
                      <span key={filter.id} className="phase-chip phase-chip-gray">
                        {filter.label}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="action-card" style={{ marginTop: "var(--space-3)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Solo ou équipe</h2>
          <p className="action-sub">
            Ce n'est pas un métier ni une vue : c'est un niveau de collaboration, indépendant de l'approche choisie.
            En solo, les responsables et permissions restent invisibles pour ne rien surcharger.
          </p>
        </div>
      </div>
    </div>
  );
}
