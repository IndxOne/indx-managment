import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ProjectOverviewProjection } from "../../../domain/v3/project-overview/types";
import { PROJECT_STATUS_LABELS } from "../../utils/project-overview-labels";
import { projectStatusToTone } from "../../utils/tone";
import { LIMITS } from "../../v3-writes/defaults";
import type { WriteAccess } from "../../v3-writes/useWriteAccess";
import { SeverityBadge } from "../SeverityBadge";

const STATUS_FR: Record<string, string> = {
  to_scope: "À cadrer", ready: "Prêt", in_progress: "En cours", blocked: "Bloqué",
  validation: "En validation", done: "Terminée", cancelled: "Annulée", waiting_external: "En attente externe",
};
const COMPLETABLE = new Set(["in_progress", "validation"]);
const CLOSED = new Set(["done", "cancelled"]);

function day(iso?: string): string {
  if (!iso) return "Non définie";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Un projet, six éléments : nom, objectif, statut, échéance, responsable, actions. Détail historique repliable. */
export function MinimalProject({
  overview,
  access,
  onAdd,
  onComplete,
  detail,
}: {
  overview: ProjectOverviewProjection;
  access: WriteAccess;
  onAdd: (title: string) => Promise<string | null>;
  onComplete: (workItemId: string) => Promise<string | null>;
  detail?: ReactNode;
}) {
  const { project, objectives, workItems } = overview;
  const open = workItems.filter((w) => !CLOSED.has(w.status));
  const done = workItems.filter((w) => w.status === "done");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) titleRef.current?.focus();
  }, [adding]);

  async function complete(id: string) {
    setBusyId(id);
    setError(null);
    setError(await onComplete(id));
    setBusyId(null);
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    const message = await onAdd(String(new FormData(form).get("title") ?? ""));
    if (message) setError(message);
    else {
      form.reset();
      setAdding(false);
    }
  }

  return (
    <div className="mini-project">
      <header>
        <p className="mini-eyebrow">Votre projet</p>
        <h1 className="mini-h1">{project.name}</h1>
        <p className="mini-sub">{objectives[0]?.statement ?? "Aucun objectif renseigné."}</p>
      </header>

      <section className="mini-card" aria-label="Résumé du projet">
        <SeverityBadge tone={projectStatusToTone(project.status)} label={PROJECT_STATUS_LABELS[project.status]} />
        <dl className="mini-facts">
          <div><dt>Échéance</dt><dd>{day(project.targetDate)}</dd></div>
          <div><dt>Responsable</dt><dd>{project.projectManager || "Non défini"}</dd></div>
          <div><dt>Actions</dt><dd>{done.length}/{workItems.length} terminées</dd></div>
        </dl>
      </section>

      <section aria-labelledby="mini-actions" className="mini-section">
        <div className="mini-head">
          <h2 id="mini-actions">Actions</h2>
          {access.canWrite && !adding && (
            <button type="button" className="btn tap-target" onClick={() => setAdding(true)}>+ Ajouter</button>
          )}
        </div>
        {adding && (
          <form className="mini-add" onSubmit={add}>
            <label className="mini-field">
              Action
              <input ref={titleRef} name="title" required maxLength={LIMITS.action} autoComplete="off" />
            </label>
            <div className="mini-buttons">
              <button type="button" className="btn tap-target" onClick={() => setAdding(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary tap-target">Ajouter l&apos;action</button>
            </div>
          </form>
        )}
        {error && <p role="alert" className="mini-error">{error}</p>}
        <ul className="mini-list">
          {open.length === 0 && <li className="mini-empty">Aucune action en attente.</li>}
          {open.map((w) => (
            <li key={w.id} className="mini-row">
              {access.canWrite && COMPLETABLE.has(w.status) ? (
                <button
                  type="button"
                  className="mini-check tap-target"
                  aria-label={`Terminer l'action ${w.title}`}
                  disabled={busyId === w.id}
                  onClick={() => complete(w.id)}
                />
              ) : (
                <span className="mini-check-spacer" aria-hidden="true" />
              )}
              <span className="mini-row-body">
                <span>{w.title}</span>
                <span className="mini-row-sub">{STATUS_FR[w.status] ?? w.status}{w.dueDate ? ` · ${day(w.dueDate)}` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
        {done.length > 0 && (
          <details className="mini-done">
            <summary className="tap-target">Terminées · {done.length}</summary>
            <ul className="mini-list">
              {done.map((w) => (
                <li key={w.id} className="mini-row mini-row-done"><span className="mini-row-body"><span>{w.title}</span></span></li>
              ))}
            </ul>
          </details>
        )}
        {access.resolved && !access.canWrite && (
          <p className="mini-note">Lecture seule : vous ne pouvez pas modifier ce projet.</p>
        )}
      </section>

      {detail && (
        <details className="mini-detail">
          <summary className="tap-target">Tout le détail du projet</summary>
          {detail}
        </details>
      )}
    </div>
  );
}
