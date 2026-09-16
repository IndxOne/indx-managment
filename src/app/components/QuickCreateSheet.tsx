import { useState } from "react";
import type { Member } from "../../domain/member";
import type { Workspace } from "../../domain/workspace";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { AddActionSheet, type AddActionInput } from "./AddActionSheet";
import { BottomSheet } from "./BottomSheet";
import { IconGrid, IconPlus, IconSun } from "./Icons";

type QuickCreateKind = "run" | "project";
type Step = { name: "choose" } | { name: "target"; kind: QuickCreateKind } | { name: "form"; workspace: Workspace };

/**
 * Étape "Que voulez-vous créer ?" du bouton central de création rapide
 * (Lot B — le placeholder minimal du Lot A ouvrait directement AddActionSheet
 * sur un espace deviné). Orchestre uniquement la sélection de destination :
 * la création elle-même reste entièrement portée par AddActionSheet/
 * useStore().createAction (aucun second moteur de création).
 *
 * "Nouveau projet" n'est proposé que parce que CreateWorkspaceScreen existe
 * déjà comme écran de création autonome (déjà une BottomSheet) : ce choix se
 * contente de fermer ce sélecteur et de naviguer vers cet écran existant,
 * sans dupliquer sa logique.
 */
export function QuickCreateSheet({
  workspaces,
  membersByWorkspace,
  onCancel,
  onCreateAction,
  onCreateProject,
}: {
  workspaces: Workspace[];
  membersByWorkspace: Record<string, Member[] | undefined>;
  onCancel: () => void;
  onCreateAction: (workspace: Workspace, input: AddActionInput) => void;
  onCreateProject: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "choose" });
  const runWorkspaces = workspaces.filter((workspace) => workspace.kind === "run");
  const projectWorkspaces = workspaces.filter((workspace) => workspace.kind === "project");

  function chooseKind(kind: QuickCreateKind) {
    const candidates = kind === "run" ? runWorkspaces : projectWorkspaces;
    if (candidates.length === 1) {
      setStep({ name: "form", workspace: candidates[0]! });
      return;
    }
    setStep({ name: "target", kind });
  }

  if (step.name === "choose") {
    return (
      <BottomSheet title="Que voulez-vous créer ?" onClose={onCancel}>
        <p id="quick-create-heading" style={{ fontWeight: 600 }}>
          Choisissez le type d'élément à créer
        </p>
        <div className="choice-group" role="group" aria-labelledby="quick-create-heading" style={{ marginBottom: 8 }}>
          {runWorkspaces.length > 0 && (
            <button type="button" className="move-axis-row" onClick={() => chooseKind("run")}>
              <span className="move-axis-icon" aria-hidden="true">
                <IconSun width={18} height={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="move-axis-label">Action RUN</span>
                <span className="move-axis-sub">Une action de la file opérationnelle du quotidien</span>
              </span>
            </button>
          )}
          {projectWorkspaces.length > 0 && (
            <button type="button" className="move-axis-row" onClick={() => chooseKind("project")}>
              <span className="move-axis-icon" aria-hidden="true">
                <IconGrid width={18} height={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="move-axis-label">Tâche Projet</span>
                <span className="move-axis-sub">Une tâche rattachée à l'un de vos projets</span>
              </span>
            </button>
          )}
          <button type="button" className="move-axis-row" onClick={onCreateProject}>
            <span className="move-axis-icon" aria-hidden="true">
              <IconPlus width={18} height={18} strokeWidth={2.4} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="move-axis-label">Nouveau projet</span>
              <span className="move-axis-sub">Créer un nouvel espace PROJET</span>
            </span>
          </button>
        </div>
        <div className="choice-group">
          <button type="button" className="action-menu-item" style={{ justifyContent: "center", fontWeight: 600 }} onClick={onCancel}>
            Annuler
          </button>
        </div>
      </BottomSheet>
    );
  }

  if (step.name === "target") {
    const candidates = step.kind === "run" ? runWorkspaces : projectWorkspaces;
    return (
      <BottomSheet title={step.kind === "run" ? "Choisir l'espace RUN" : "Choisir le projet"} onClose={onCancel}>
        <p style={{ fontWeight: 600 }}>{step.kind === "run" ? "Dans quel espace RUN ?" : "Dans quel projet ?"}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {candidates.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              className="phase-select-btn"
              onClick={() => setStep({ name: "form", workspace })}
            >
              {workspace.name}
            </button>
          ))}
        </div>
        <div className="choice-group">
          <button
            type="button"
            className="action-menu-item"
            style={{ justifyContent: "center", fontWeight: 600 }}
            onClick={() => setStep({ name: "choose" })}
          >
            Retour
          </button>
        </div>
      </BottomSheet>
    );
  }

  // step.name === "form"
  const workspace = step.workspace;
  const preset = resolveWorkspacePreset(workspace);
  const isTeam = workspace.collaborationMode === "team";
  const members = isTeam ? membersByWorkspace[workspace.id] ?? [] : undefined;

  return (
    <AddActionSheet
      phaseOptions={workspace.kind === "project" ? preset.phaseTemplate : undefined}
      members={members}
      onCancel={onCancel}
      onCreate={(input) => onCreateAction(workspace, input)}
    />
  );
}
