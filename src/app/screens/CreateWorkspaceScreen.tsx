import { useState, type FormEvent } from "react";
import type { ProfessionalApproach, WorkspaceKind } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { useStore } from "../adapters/temporary-store";
import { BottomSheet } from "../components/BottomSheet";
import { IconGrid, IconSun } from "../components/Icons";

// Mirroir du cadrage §8 (valeurs proposées par défaut) — l'approche métier
// n'est plus demandée ici (un nom suffit pour démarrer, comme le prototype
// de référence) ; elle reste modifiable ensuite dans les réglages de
// l'espace (ApproachSettingsScreen).
const SUGGESTED_APPROACH_BY_KIND: Record<WorkspaceKind, ProfessionalApproach> = {
  run: "it_ops",
  project: "project_amoa",
};

export function CreateWorkspaceScreen({
  onCreated,
  onCancel,
}: {
  onCreated: (workspace: Workspace) => void;
  onCancel: () => void;
}) {
  const { createWorkspaceAction } = useStore();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<WorkspaceKind>("run");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Le nom de l'espace est requis.");
      return;
    }
    try {
      const workspace = createWorkspaceAction({ name, kind, approach: SUGGESTED_APPROACH_BY_KIND[kind] });
      onCreated(workspace);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création impossible.");
    }
  }

  return (
    <BottomSheet title="Nouvel espace" onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate>
        <p style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "var(--space-4)" }}>Nouvel espace</p>
        <div className="field">
          <label htmlFor="workspace-name">Nom de l'espace</label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "workspace-name-error" : undefined}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- écran de création ouvert par une action explicite, focus attendu sur le premier champ
            autoFocus
          />
        </div>

        <fieldset className="field" style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Nature de l'espace</legend>
          <div className="choice-group">
            <label className="choice-option">
              <input type="radio" name="kind" checked={kind === "run"} onChange={() => setKind("run")} />
              <span className="workspace-icon" data-kind="run" aria-hidden="true">
                <IconSun width={18} height={18} />
              </span>
              Travail continu (RUN)
            </label>
            <label className="choice-option">
              <input type="radio" name="kind" checked={kind === "project"} onChange={() => setKind("project")} />
              <span className="workspace-icon" data-kind="project" aria-hidden="true">
                <IconGrid width={18} height={18} />
              </span>
              Projet avec étapes (PROJET)
            </label>
          </div>
        </fieldset>

        {error && (
          <p id="workspace-name-error" role="alert" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block tap-target">
          Créer l'espace
        </button>
        <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onCancel}>
          Annuler
        </button>
      </form>
    </BottomSheet>
  );
}
