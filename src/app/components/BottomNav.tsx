import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconBell, IconCalendar, IconGrid, IconMore, IconSun, IconTray } from "./Icons";

export type NavTab = "today" | "run" | "spaces" | "more" | "week" | "reminders";

/**
 * 4 destinations, pas de bouton "+" : la création passe par le compositeur
 * universel posé juste au-dessus (cf. Composer), toujours à portée de pouce.
 */
const TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "run", label: "Espaces", Icon: IconTray },
  { id: "spaces", label: "Projets", Icon: IconGrid },
  { id: "more", label: "Plus", Icon: IconMore },
];

/** Desktop : mêmes destinations, Cette semaine/Relances en accès direct. */
const DESKTOP_TABS: typeof TABS = [
  ...TABS.slice(0, 3),
  { id: "week", label: "Cette semaine", Icon: IconCalendar },
  { id: "reminders", label: "Relances", Icon: IconBell },
  ...TABS.slice(3),
];

export function BottomNav({
  active,
  onChange,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /** Espaces listés dans la barre latérale desktop (kind=run uniquement). */
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
}) {
  // Rendu conditionnel (pas seulement masqué en CSS) : évite des boutons
  // homonymes en double pour les lecteurs d'écran.
  const isDesktop = useIsDesktop();
  const runWorkspaces = workspaces.filter((workspace) => workspace.kind === "run");

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {(isDesktop ? DESKTOP_TABS : TABS).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="bottom-nav-item tap-target"
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon width={22} height={22} strokeWidth={1.7} />
          <span>{label}</span>
        </button>
      ))}

      {isDesktop && runWorkspaces.length > 0 && (
        <div className="sidebar-workspaces">
          <span className="sidebar-workspaces-title">Mes espaces</span>
          <ul className="sidebar-workspace-list">
            {runWorkspaces.map((workspace) => (
              <li key={workspace.id}>
                <button
                  type="button"
                  className="sidebar-workspace-item tap-target"
                  aria-current={activeWorkspaceId === workspace.id ? "page" : undefined}
                  onClick={() => onSelectWorkspace(workspace.id)}
                >
                  <IconTray width={16} height={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>{workspace.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
