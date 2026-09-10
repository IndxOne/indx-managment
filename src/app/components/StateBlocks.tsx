import type { ReactNode } from "react";
import { IconTray } from "./Icons";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="state-block" role="status">
      <IconTray width={40} height={40} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--color-text-tertiary)" }} />
      <p style={{ fontWeight: 600, color: "var(--color-text)" }}>{title}</p>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Une erreur est survenue",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block" data-variant="error" role="alert">
      <p style={{ fontWeight: 600 }}>{title}</p>
      {description && <p>{description}</p>}
      {onRetry && (
        <button type="button" className="btn tap-target" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="state-block" role="status">
      <p style={{ fontWeight: 600, color: "var(--color-text)" }}>Aucune action ne correspond aux filtres</p>
      <button type="button" className="btn tap-target" onClick={onClearFilters}>
        Réinitialiser les filtres
      </button>
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      Hors connexion - les modifications seront conservées localement.
    </div>
  );
}
