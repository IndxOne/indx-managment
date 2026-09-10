import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconCalendar, IconCompass, IconGrid, IconMore, IconPlus, IconSun } from "./Icons";

export type NavTab = "today" | "week" | "spaces" | "more";

const TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "week", label: "Semaine", Icon: IconCalendar },
  { id: "spaces", label: "Espaces", Icon: IconGrid },
  { id: "more", label: "Plus", Icon: IconMore },
];

export function BottomNav({
  active,
  onChange,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onOpenRoles = () => {},
  rolesActive = false,
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /** Liste des espaces affichée dans la barre latérale à partir de 1024px (masquée en CSS sur mobile, cf. .sidebar-workspaces). */
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  /** Accès direct à "Approches métier" depuis la sidebar desktop, en plus de
   * l'entrée existante dans "Plus" — provisoire, le temps de voir si ça
   * mérite une place permanente hors du sous-menu. */
  onOpenRoles?: () => void;
  rolesActive?: boolean;
}) {
  // Rendu conditionnel (pas seulement masqué en CSS) : sur mobile, la liste
  // des espaces vit déjà dans l'onglet "Espaces" — la dupliquer dans le DOM
  // créerait des boutons de même nom accessibles en double (lecteur d'écran,
  // tests). Même seuil que le passage sidebar en CSS (cf. useIsDesktop).
  const isDesktop = useIsDesktop();

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="bottom-nav-item tap-target"
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon width={24} height={24} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}

      {isDesktop && (
        <div className="sidebar-workspaces">
          <button
            type="button"
            className="sidebar-workspace-item tap-target"
            aria-current={rolesActive ? "page" : undefined}
            onClick={onOpenRoles}
          >
            <IconCompass width={16} height={16} strokeWidth={1.6} aria-hidden="true" />
            <span>Approches métier</span>
          </button>
          <span className="sidebar-workspaces-title">Mes espaces</span>
          <ul className="sidebar-workspace-list">
            {workspaces.map((workspace) => {
              const Icon = workspace.kind === "run" ? IconSun : IconGrid;
              return (
                <li key={workspace.id}>
                  <button
                    type="button"
                    className="sidebar-workspace-item tap-target"
                    aria-current={activeWorkspaceId === workspace.id ? "page" : undefined}
                    onClick={() => onSelectWorkspace(workspace.id)}
                  >
                    <Icon width={16} height={16} strokeWidth={1.6} aria-hidden="true" />
                    <span>{workspace.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="sidebar-workspace-create tap-target" onClick={onCreateWorkspace}>
            <IconPlus width={14} height={14} strokeWidth={2} />
            Nouveau projet
          </button>
        </div>
      )}
    </nav>
  );
}
