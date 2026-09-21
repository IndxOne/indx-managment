import type { ProjectOverviewSummary } from "../../../domain/v3/project-overview/types";

function formatTargetDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Zone "Ensuite" (UX-5.1) — prochain jalon uniquement, réutilise
 * pickNextMilestone() déjà calculé dans summary.nextMilestone (aucune
 * nouvelle requête). Tap => Mon Brief : aucune route détail jalon
 * n'existe (décision de gate déjà actée), le renvoi vers Mon Brief est le
 * fallback documenté au lieu d'une navigation cassée (§7 CLAUDE_TASK.md).
 *
 * pickNextMilestone() n'exclut que le statut "accepted" (§ build-project-
 * overview.ts) : un jalon "refused" reste candidat tant qu'il n'est pas
 * resoumis. L'ancienne section détaillée affichait ce statut ; cette carte
 * doit continuer à le montrer explicitement (correctif review Codex),
 * sinon un jalon refusé se lit comme un jalon normal à venir.
 */
export function ProjectNextUp({
  nextMilestone,
  focused,
  onOpenBrief,
}: {
  nextMilestone: ProjectOverviewSummary["nextMilestone"];
  /** Deep-link (focusType/focusId) ciblant exactement ce jalon — §7. */
  focused: boolean;
  onOpenBrief: () => void;
}) {
  return (
    <section className="project-next-up" aria-label="Ensuite">
      <h2 className="project-pilot-zone-title">Ensuite</h2>
      {nextMilestone ? (
        <button
          type="button"
          className="project-next-up-card tap-target"
          data-focused={focused || undefined}
          onClick={onOpenBrief}
        >
          <span className="project-next-up-label">Prochain jalon</span>
          <span className="project-next-up-title">{nextMilestone.observableResult}</span>
          <span className="project-next-up-date">
            {formatTargetDate(nextMilestone.targetDate)}
            {nextMilestone.status ? ` · ${nextMilestone.status.replace(/_/g, " ")}` : ""}
          </span>
        </button>
      ) : (
        <p className="project-next-up-empty">Aucun jalon planifié.</p>
      )}
    </section>
  );
}
