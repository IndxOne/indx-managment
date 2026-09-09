import { useState } from "react";
import type { CarnetNote } from "../adapters/store-context";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { KIND_LABELS, phaseLabel } from "../labels";
import { phaseChipClass } from "../utils/phase-color";
import { BottomSheet } from "./BottomSheet";
import { IconGrid, IconSun } from "./Icons";

/**
 * Conversion minimale : le texte de la note devient le titre d'une tâche
 * (type "task", priorité normale). Pour un besoin plus riche (type,
 * priorité...), l'utilisateur édite l'action une fois créée.
 */
export function ConvertNoteSheet({
  note,
  workspaces,
  onCancel,
  onConvert,
}: {
  note: CarnetNote;
  workspaces: Workspace[];
  onCancel: () => void;
  onConvert: (workspaceId: string, phaseId?: string) => void;
}) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const workspace = workspaceId ? workspaces.find((candidate) => candidate.id === workspaceId) : undefined;
  const phaseOptions = workspace ? resolveWorkspacePreset(workspace).phaseTemplate ?? [] : [];

  if (workspace && phaseOptions.length > 0) {
    return (
      <BottomSheet title="Convertir - choisir la phase" onClose={onCancel}>
        <p style={{ fontWeight: 600 }}>Nouvelle phase</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {phaseOptions.map((phase) => (
            <button
              key={phase}
              type="button"
              className={`phase-select-btn ${phaseChipClass(phase)}`}
              onClick={() => onConvert(workspace.id, phase)}
            >
              {phaseLabel(phase)}
            </button>
          ))}
        </div>
        <div className="choice-group">
          <button
            type="button"
            className="action-menu-item"
            style={{ justifyContent: "center", fontWeight: 600 }}
            onClick={() => setWorkspaceId(null)}
          >
            Retour
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="Convertir en action" onClose={onCancel}>
      <p style={{ fontWeight: 600 }}>« {note.text} »</p>
      <p className="action-sub">Choisir l'espace de destination</p>
      {workspaces.length === 0 ? (
        <p className="action-sub">Aucun espace disponible - crée d'abord un espace.</p>
      ) : (
        <div className="choice-group" style={{ marginBottom: 8 }}>
          {workspaces.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="workspace-choice-row"
              onClick={() => {
                const preset = resolveWorkspacePreset(candidate);
                if ((preset.phaseTemplate ?? []).length > 0) {
                  setWorkspaceId(candidate.id);
                } else {
                  onConvert(candidate.id);
                }
              }}
            >
              <span className="workspace-icon" data-kind={candidate.kind} aria-hidden="true" style={{ width: 36, height: 36 }}>
                {candidate.kind === "run" ? <IconSun width={16} height={16} /> : <IconGrid width={16} height={16} />}
              </span>
              <span style={{ flex: 1 }}>{candidate.name}</span>
              <span className={`badge badge-${candidate.kind}`}>{KIND_LABELS[candidate.kind]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="choice-group">
        <button type="button" className="action-menu-item" style={{ justifyContent: "center", fontWeight: 600 }} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
}
