import type { ProjectContextRow } from "../../utils/project-overview-labels";

function ProjectContextRows({ rows, compact }: { rows: ProjectContextRow[]; compact: boolean }) {
  const visible = compact ? rows.filter((row) => !row.hideInCompact) : rows;
  return (
    <dl className="project-context-rows">
      {visible.map((row) => (
        <div className="project-context-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Rail contextuel desktop (UX-5.4) — contexte stable du projet (chef de
 * projet, sponsor, méthode, dates, statut, criticité), à côté de la zone de
 * pilotage active, jamais devant elle. Masqué en dessous de 1024px (CSS) :
 * pas de rail latéral mobile, voir `ProjectContextCompact`.
 */
export function ProjectContextRail({ rows }: { rows: ProjectContextRow[] }) {
  return (
    <aside className="project-context-rail" aria-label="Contexte du projet">
      <h2 className="project-pilot-zone-title">Contexte</h2>
      <ProjectContextRows rows={rows} compact={false} />
    </aside>
  );
}

/**
 * Bloc contexte compact mobile/tablette (UX-5.4) — disclosure native
 * (`<details>`, accessible sans rôle artificiel), repliée par défaut,
 * n'affiche pas statut/criticité (déjà visibles dans le header). Masqué à
 * partir de 1024px (CSS) : le rail desktop prend le relais.
 */
export function ProjectContextCompact({ rows }: { rows: ProjectContextRow[] }) {
  return (
    <details className="project-context-compact">
      <summary className="project-context-compact-summary tap-target">Contexte du projet</summary>
      <ProjectContextRows rows={rows} compact />
    </details>
  );
}
