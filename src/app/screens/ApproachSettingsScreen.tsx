import { useState } from "react";
import type { CollaborationMode, ProfessionalApproach } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import {
  computeHiddenFieldsOnApproachChange,
  isRecommendedApproach,
  PRESET_REGISTRY,
} from "../../presets/preset-registry";
import { APPROACH_DESCRIPTIONS, APPROACH_LABELS, phaseLabel } from "../labels";
import { useAnnouncer } from "../a11y/announcer";
import { useStore } from "../adapters/temporary-store";
import { resolveDisplayPhaseId } from "../utils/resolve-phase";
import { MembersSheet } from "../components/MembersSheet";

const ALL_APPROACHES = Object.keys(PRESET_REGISTRY) as ProfessionalApproach[];

const FREQUENCY_LABELS = { daily: "Quotidienne", weekly: "Hebdomadaire", monthly: "Mensuelle" } as const;

export function ApproachSettingsScreen({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const {
    state,
    changeApproach,
    editWorkspaceDescription,
    deleteRecurringRule,
    setCollaborationMode,
    createMember,
    renameMember,
    setMemberActive,
  } = useStore();
  const { announce } = useAnnouncer();
  const recurrenceRules = state.recurrenceRulesByWorkspace[workspace.id] ?? [];
  const members = state.membersByWorkspace?.[workspace.id] ?? [];
  const [membersOpen, setMembersOpen] = useState(false);
  const [selected, setSelected] = useState<ProfessionalApproach>(workspace.approach);
  const [confirmed, setConfirmed] = useState(false);
  const [description, setDescription] = useState(workspace.description ?? "");
  // Suivi séparé de `workspace.description` : ce dernier est mis à jour de façon
  // optimiste dès l'appel (avant confirmation Supabase), donc s'y comparer
  // masquerait un échec réseau (bouton désactivé alors que rien n'est
  // persisté, notes reperdues au rechargement — cf. revue Codex PR#19).
  const [savedDescription, setSavedDescription] = useState(workspace.description ?? "");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [savingDescription, setSavingDescription] = useState(false);

  const currentPreset = PRESET_REGISTRY[workspace.approach];
  const hiddenFields = computeHiddenFieldsOnApproachChange(workspace.approach, selected, currentPreset.visibleFields);
  const recommended = isRecommendedApproach(workspace.kind, selected);
  const isChange = selected !== workspace.approach;
  const canConfirm = !isChange || hiddenFields.length === 0 || confirmed;

  const descriptionChanged = description.trim() !== savedDescription;

  function handleApply() {
    changeApproach(workspace.id, selected);
    announce(`Approche changée pour ${APPROACH_LABELS[selected]}. Aucune action n'a été modifiée.`);
    onDone();
  }

  function handleCollaborationModeChange(mode: CollaborationMode) {
    setCollaborationMode(workspace.id, mode);
    announce(
      mode === "team"
        ? "Mode Équipe activé. Vous pouvez maintenant définir des membres et assigner des actions."
        : "Mode Solo activé. Les membres et assignations existants sont conservés, seuls les contrôles sont masqués."
    );
  }

  async function handleSaveDescription() {
    const value = description;
    setSavingDescription(true);
    setDescriptionError(null);
    try {
      await editWorkspaceDescription(workspace.id, value);
      setSavedDescription(value.trim());
      announce("Notes du projet enregistrées.");
    } catch {
      setDescriptionError("Échec de l'enregistrement. Réessayez.");
    } finally {
      setSavingDescription(false);
    }
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

        <div className="field">
          <label htmlFor="workspace-description">Notes du projet</label>
          <textarea
            id="workspace-description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Contexte, objectifs, liens utiles…"
          />
          {descriptionError && (
            <p role="alert" style={{ color: "var(--color-danger)" }}>
              {descriptionError}
            </p>
          )}
          <button
            type="button"
            className="btn tap-target"
            style={{ marginTop: 8 }}
            disabled={!descriptionChanged || savingDescription}
            onClick={handleSaveDescription}
          >
            Enregistrer les notes
          </button>
        </div>

        <fieldset className="field" style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Mode de travail</legend>
          <div className="choice-group">
            <label className="choice-option">
              <input
                type="radio"
                name="collaboration-mode"
                checked={workspace.collaborationMode === "solo"}
                onChange={() => handleCollaborationModeChange("solo")}
              />
              Solo
            </label>
            <label className="choice-option">
              <input
                type="radio"
                name="collaboration-mode"
                checked={workspace.collaborationMode === "team"}
                onChange={() => handleCollaborationModeChange("team")}
              />
              Équipe
            </label>
          </div>
        </fieldset>

        {workspace.collaborationMode === "team" && (
          <fieldset className="field" style={{ border: "none", padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Membres</legend>
            <p className="action-sub" style={{ marginBottom: 8 }}>
              {members.length === 0
                ? "Aucun membre pour l'instant."
                : `${members.filter((m) => m.active).length} membre(s) actif(s) sur ${members.length}.`}
            </p>
            <button type="button" className="btn tap-target" onClick={() => setMembersOpen(true)}>
              Gérer les membres
            </button>
          </fieldset>
        )}

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
          <p role="status" style={{ color: "var(--color-warning-text)" }}>
            Combinaison inhabituelle pour un espace {workspace.kind === "run" ? "RUN" : "PROJET"} - autorisée, mais non
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
        <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8, marginBottom: 24 }} onClick={onDone}>
          Annuler
        </button>

        {recurrenceRules.length > 0 && (
          <fieldset className="field" style={{ border: "none", padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Récurrences actives</legend>
            <div className="action-card-list">
              {recurrenceRules.map((rule) => {
                const displayPhaseId = rule.template.phaseId
                  ? resolveDisplayPhaseId(rule.template.phaseId, currentPreset.phaseTemplate ?? [])
                  : undefined;
                return (
                  <div className="action-card" key={rule.id}>
                    <div className="action-card-body">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="action-title">{rule.template.title}</span>
                        <div className="action-sub">
                          {FREQUENCY_LABELS[rule.frequency]}
                          {rule.interval > 1 ? ` (tous les ${rule.interval})` : ""}
                          {displayPhaseId ? ` · ${phaseLabel(displayPhaseId)}` : ""}
                          {rule.endDate ? ` · jusqu'au ${rule.endDate}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-danger-text"
                        onClick={() => {
                          deleteRecurringRule(workspace.id, rule.id);
                          announce(`Récurrence « ${rule.template.title} » arrêtée.`);
                        }}
                      >
                        Arrêter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      {membersOpen && (
        <MembersSheet
          members={members}
          onClose={() => setMembersOpen(false)}
          onAdd={(displayName) => createMember({ workspaceId: workspace.id, displayName })}
          onRename={(memberId, displayName) => renameMember(workspace.id, memberId, displayName)}
          onSetActive={(memberId, active) => setMemberActive(workspace.id, memberId, active)}
        />
      )}
    </div>
  );
}
