import { useEffect, useRef, useState, type FormEvent } from "react";
import { LIMITS } from "../../v3-writes/defaults";

/** Création minimale : nom + objectif obligatoires, responsable et échéance facultatifs. */
export function CreateProjectDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (v: { name: string; objective: string; projectManager: string; dueDate: string }) => Promise<string | null>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const message = await onSubmit({
      name: String(fd.get("name") ?? ""),
      objective: String(fd.get("objective") ?? ""),
      projectManager: String(fd.get("manager") ?? ""),
      dueDate: String(fd.get("due") ?? ""),
    });
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <div className="mini-backdrop">
      <section className="mini-dialog" role="dialog" aria-modal="true" aria-labelledby="mini-new-title">
        <h2 id="mini-new-title">Nouveau projet</h2>
        <p className="mini-hint">Commencez avec le minimum. Le reste est facultatif.</p>
        <form onSubmit={submit}>
          <label className="mini-field">
            Nom du projet
            <input ref={first} name="name" required maxLength={LIMITS.name} autoComplete="off" />
          </label>
          <label className="mini-field">
            Objectif
            <textarea name="objective" required maxLength={LIMITS.objective} />
          </label>
          <label className="mini-field">
            Responsable <span className="mini-optional">(facultatif)</span>
            <input name="manager" maxLength={80} />
          </label>
          <label className="mini-field">
            Échéance <span className="mini-optional">(facultative)</span>
            <input name="due" type="date" />
          </label>
          {error && <p role="alert" className="mini-error">{error}</p>}
          <div className="mini-buttons">
            <button type="button" className="btn tap-target" onClick={onClose} disabled={busy}>Annuler</button>
            <button type="submit" className="btn btn-primary tap-target" disabled={busy}>{busy ? "Création…" : "Créer le projet"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
