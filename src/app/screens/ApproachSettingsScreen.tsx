import { useState } from "react";
import type { ProfessionalApproach } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import {
  computeHiddenFieldsOnApproachChange,
  isRecommendedApproach,
  PRESET_REGISTRY,
} from "../../presets/preset-registry";
import { APPROACH_DESCRIPTIONS, APPROACH_LABELS } from "../labels";
import { useAnnouncer } from "../a11y/announcer";
import { useStore } from "../adapters/temporary-store";

const ALL_APPROACHES = Object.keys(PRESET_REGISTRY) as ProfessionalApproach[];

export function ApproachSettingsScreen({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const { changeApproach } = useStore();
  const { announce } = useAnnouncer();
  const [selected, setSelected] = useState<ProfessionalApproach>(workspace.approach);
  const [confirmed, setConfirmed] = useState(false);

  const currentPreset = PRESET_REGISTRY[workspace.approach];
  const hiddenFields = computeHiddenFieldsOnApproachChange(workspace.approach, selected, currentPreset.visibleFields);
  const recommended = isRecommendedApproach(workspace.kind, selected);
  const isChange = selected !== workspace.approach;
  const canConfirm = !isChange || hiddenFields.length === 0 || confirmed;

  function handleApply() {
    changeApproach(workspace.id, selected);
    announce(`Approche changée pour ${APPROACH_LABELS[selected]}. Aucune action n'a été modifiée.`);
    onDone();
  }

  return (
    <div>
      <div className="top-bar">
        <h1>Approche métier</h1>
      </div>
      <div className="app-main">
        <p className="action-sub">
          Espace actuel : <strong>{APPROACH_LABELS[workspace.approach]}</strong>
        </p>

        <fieldset className="field" style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Nouvelle approche</legend>
          <div className="choice-group">
            {ALL_APPROACHES.map((approach) => (
              <label key={approach} className="choice-option">
                <input
                  type="radio"
                  name="approach"
                  checked={selected === approach}
                  onChange={() => {
                    setSelected(approach);
                    setConfirmed(false);
                  }}
                />
                <span>
                  {APPROACH_LABELS[approach]}
                  <span className="action-sub" style={{ display: "block" }}>
                    {APPROACH_DESCRIPTIONS[approach]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {isChange && !recommended && (
          <p role="status" style={{ color: "var(--color-warning)" }}>
            Combinaison inhabituelle pour un espace {workspace.kind === "run" ? "RUN" : "PROJET"} — autorisée, mais non
            recommandée.
          </p>
        )}

        {isChange && (
          <div className="confirm-diff" role="status">
            <p style={{ fontWeight: 600, marginTop: 0 }}>Aperçu du changement</p>
            <p>Aucune action, aucun statut et aucune échéance ne seront modifiés.</p>
            {hiddenFields.length > 0 ? (
              <>
                <p>Champs actuellement visibles qui seront masqués :</p>
                <ul>
                  {hiddenFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
                <label className="choice-option">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  Je confirme malgré le masquage de ces champs (les données restent intactes).
                </label>
              </>
            ) : (
              <p>Aucun champ actuellement utilisé ne sera masqué.</p>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block tap-target"
          disabled={!isChange || !canConfirm}
          onClick={handleApply}
        >
          Appliquer l'approche
        </button>
        <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onDone}>
          Annuler
        </button>
      </div>
    </div>
  );
}
