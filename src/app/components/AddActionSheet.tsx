import { useEffect, useState } from "react";
import type { Priority, WorkItemType, WorkspaceKind } from "../../domain/types";
import type { RecurrenceFrequency } from "../../recurrence/recurrence-engine";
import { ITEM_TYPE_LABELS, ITEM_TYPE_OPTIONS, phaseLabel, PRIORITY_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

const PRIORITY_OPTIONS: Priority[] = ["high", "normal", "low"];
const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle" },
];

export interface AddActionSheetWorkspaceOption {
  id: string;
  name: string;
  kind: WorkspaceKind;
}

export interface AddActionInput {
  title: string;
  itemType: WorkItemType;
  priority: Priority;
  phaseId?: string;
  /** Présent uniquement quand `workspaceOptions` est fourni (création rapide globale, v2.2) — absent dans les écrans d'espace, où l'espace de destination est déjà connu du contexte appelant. */
  workspaceId?: string;
  /** Échéance optionnelle (v2.2, champ "Échéance" du prototype) — YYYY-MM-DD, ou absent si non renseignée. Ignoré côté appelant quand `repeat` est présent (la récurrence porte sa propre date de départ). */
  dueDate?: string;
  /** Présent seulement si "Répéter cette action" est activé. */
  repeat?: {
    frequency: RecurrenceFrequency;
    interval: number;
    startDate: string;
    endDate?: string;
  };
}

export function AddActionSheet({
  phaseOptions,
  defaultPhaseId,
  initialTitle,
  /** Création rapide globale (v2.2, bouton central de BottomNav) : quand fourni, affiche un sélecteur "Action RUN" / "Tâche Projet" + espace cible, et `onCreate` reçoit `workspaceId`. Absent = comportement inchangé (écrans d'espace, où la destination est déjà fixée). */
  workspaceOptions,
  defaultWorkspaceId,
  onCancel,
  onCreate,
}: {
  phaseOptions?: string[];
  defaultPhaseId?: string;
  initialTitle?: string;
  workspaceOptions?: AddActionSheetWorkspaceOption[];
  defaultWorkspaceId?: string;
  onCancel: () => void;
  onCreate: (input: AddActionInput) => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [dueDate, setDueDate] = useState("");
  const [itemType, setItemType] = useState<WorkItemType>("task");
  const [priority, setPriority] = useState<Priority>("normal");
  const [phaseId, setPhaseId] = useState<string | undefined>(defaultPhaseId ?? phaseOptions?.[0]);
  const [error, setError] = useState<string | null>(null);

  const runOptions = workspaceOptions?.filter((option) => option.kind === "run") ?? [];
  const projectOptions = workspaceOptions?.filter((option) => option.kind === "project") ?? [];
  const hasDestinationPicker = Boolean(workspaceOptions);
  const [destinationKind, setDestinationKind] = useState<WorkspaceKind>(() => {
    const preset = workspaceOptions?.find((option) => option.id === defaultWorkspaceId);
    if (preset) return preset.kind;
    return runOptions.length > 0 ? "run" : "project";
  });
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    defaultWorkspaceId ?? (destinationKind === "run" ? runOptions[0]?.id : projectOptions[0]?.id)
  );

  // La création rapide (bouton central) peut s'ouvrir avant la fin de
  // l'hydratation du store (Supabase) : `workspaceOptions` arrive alors vide
  // au premier rendu, et l'initialisation ci-dessus (useState, exécutée une
  // seule fois) fige `workspaceId` à `undefined`. Sans cette réconciliation,
  // un espace qui apparaît ensuite (ex. le seul RUN existant) ne serait
  // jamais sélectionné tant que l'utilisateur ne rebascule pas la radio.
  useEffect(() => {
    if (!hasDestinationPicker) return;
    // Le type sélectionné peut se retrouver sans aucun espace disponible
    // (ex. RUN choisi par défaut au montage puis résilié, ou l'inverse) alors
    // que l'autre type en a désormais : suit la même heuristique qu'à
    // l'initialisation plutôt que de laisser le radio pointer vers une liste
    // vide jusqu'à un basculement manuel.
    if (destinationKind === "project" && projectOptions.length === 0 && runOptions.length > 0) {
      setDestinationKind("run");
      return;
    }
    if (destinationKind === "run" && runOptions.length === 0 && projectOptions.length > 0) {
      setDestinationKind("project");
      return;
    }
    const options = destinationKind === "run" ? runOptions : projectOptions;
    if (workspaceId && options.some((option) => option.id === workspaceId)) return;
    setWorkspaceId(options[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne réagit qu'à l'arrivée/au changement des options ou du type choisi, pas à workspaceId (qu'il modifie lui-même)
  }, [workspaceOptions, destinationKind]);

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [interval, setInterval] = useState("1");
  const [endDate, setEndDate] = useState("");
  const intervalValue = Number(interval);
  const intervalValid = Number.isInteger(intervalValue) && intervalValue >= 1;

  function handleSubmit() {
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (hasDestinationPicker && !workspaceId) {
      setError("Choisis un espace de destination.");
      return;
    }
    if (repeatEnabled && !intervalValid) {
      setError("L'intervalle de répétition doit être un nombre entier >= 1.");
      return;
    }
    const input: AddActionInput = {
      title: title.trim(),
      itemType,
      priority,
      phaseId,
      dueDate: dueDate || undefined,
      repeat: repeatEnabled
        ? {
            frequency,
            interval: intervalValue,
            startDate: new Date().toISOString().slice(0, 10),
            endDate: endDate || undefined,
          }
        : undefined,
    };
    // N'ajoute la clé que si un sélecteur de destination est affiché : sinon
    // le spread `{...input}` des écrans d'espace (RunWorkspaceScreen,
    // ProjectWorkspaceScreen) écraserait leur `workspaceId: workspace.id`
    // avec `undefined`.
    if (hasDestinationPicker) input.workspaceId = workspaceId;
    onCreate(input);
  }

  return (
    <BottomSheet title="Ajouter une action" onClose={onCancel}>
      <div className="field">
        <label htmlFor="new-action-title">Titre</label>
        <input
          id="new-action-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet ouvert par une action explicite, focus attendu (pattern dialog APG)
          autoFocus
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
      </div>

      {hasDestinationPicker && (
        <fieldset className="field" style={{ border: "none", padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Destination</legend>
          <div className="choice-group" role="radiogroup" aria-label="Destination">
            <label className="choice-option">
              <input
                type="radio"
                name="quick-add-destination-kind"
                checked={destinationKind === "run"}
                disabled={runOptions.length === 0}
                onChange={() => {
                  setDestinationKind("run");
                  setWorkspaceId(runOptions[0]?.id);
                }}
              />
              Action RUN
            </label>
            <label className="choice-option">
              <input
                type="radio"
                name="quick-add-destination-kind"
                checked={destinationKind === "project"}
                disabled={projectOptions.length === 0}
                onChange={() => {
                  setDestinationKind("project");
                  setWorkspaceId(projectOptions[0]?.id);
                }}
              />
              Tâche Projet
            </label>
          </div>

          {destinationKind === "run" &&
            (runOptions.length === 0 ? (
              <p className="action-sub">Aucun espace RUN pour l'instant.</p>
            ) : runOptions.length > 1 ? (
              <div className="field">
                <label htmlFor="quick-add-run-target">Espace RUN</label>
                <select
                  id="quick-add-run-target"
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                >
                  {runOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null)}

          {destinationKind === "project" &&
            (projectOptions.length === 0 ? (
              <p className="action-sub">Aucun projet pour l'instant.</p>
            ) : (
              <div className="field">
                <label htmlFor="quick-add-project-target">Projet cible</label>
                <select
                  id="quick-add-project-target"
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                >
                  {projectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="new-action-type">Type</label>
        <select id="new-action-type" value={itemType} onChange={(event) => setItemType(event.target.value as WorkItemType)}>
          {ITEM_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ITEM_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="new-action-due-date">Échéance</label>
        <input
          id="new-action-due-date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="new-action-priority">Priorité</label>
        <select id="new-action-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {phaseOptions && phaseOptions.length > 0 && (
        <div className="field">
          <label htmlFor="new-action-phase">Phase</label>
          <select id="new-action-phase" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
            {phaseOptions.map((phase) => (
              <option key={phase} value={phase}>
                {phaseLabel(phase)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="choice-group" style={{ marginBottom: 8 }}>
        <label className="choice-option">
          <input type="checkbox" checked={repeatEnabled} onChange={(event) => setRepeatEnabled(event.target.checked)} />
          Répéter cette action
        </label>
      </div>

      {repeatEnabled && (
        <>
          <div className="field">
            <label htmlFor="new-action-frequency">Fréquence</label>
            <select
              id="new-action-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="new-action-interval">Tous les combien</label>
            <input
              id="new-action-interval"
              type="number"
              min={1}
              step={1}
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
              aria-invalid={!intervalValid}
            />
          </div>

          <div className="field">
            <label htmlFor="new-action-end-date">Jusqu'au (optionnel)</label>
            <input
              id="new-action-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleSubmit}>
          Créer l'action
        </button>
        <button type="button" className="btn btn-block tap-target" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </BottomSheet>
  );
}
