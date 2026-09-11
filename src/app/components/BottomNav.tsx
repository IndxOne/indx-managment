import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconBell, IconCalendar, IconCompass, IconGrid, IconMore, IconPlus, IconSun } from "./Icons";

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
  onOpenReminders = () => {},
  remindersActive = false,
  onOpenRoles = () => {},
  rolesActive = false,
  secondTab = "week",
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /** Liste des espaces affichée dans la barre latérale à partir de 1024px (masquée en CSS sur mobile, cf. .sidebar-workspaces). */
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  /** Accès direct à "Rappels" et "Approches métier" depuis la sidebar
   * desktop, en plus des entrées existantes dans "Plus" — l'ordre y est
   * imposé (Espaces, Aujourd'hui, Semaine, Rappels, Approches métier, Plus)
   * façon prototype de référence, donc rendu à part plutôt que via TABS. */
  onOpenReminders?: () => void;
  remindersActive?: boolean;
  onOpenRoles?: () => void;
  rolesActive?: boolean;
  /** Personnalisation mobile (Réglages) : la 2e destination remplace
   * "Semaine" par "Rappels" quand elle vaut "reminders". N'affecte pas la
   * sidebar desktop, qui propose déjà les deux en permanence. */
  secondTab?: "week" | "reminders";
}) {
  // Rendu conditionnel (pas seulement masqué en CSS) : sur mobile, la liste
  // des espaces vit déjà dans l'onglet "Espaces" — la dupliquer dans le DOM
  // créerait des boutons de même nom accessibles en double (lecteur d'écran,
  // tests). Même seuil que le passage sidebar en CSS (cf. useIsDesktop).
  const isDesktop = useIsDesktop();

  const tabsById = Object.fromEntries(TABS.map((tab) => [tab.id, tab])) as Record<NavTab, (typeof TABS)[number]>;

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {isDesktop ? (
        <>
          {(["spaces", "today", "week"] as const).map((id) => {
            const { label, Icon } = tabsById[id];
            return (
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
            );
          })}
          <button
            type="button"
            className="bottom-nav-item tap-target"
            aria-current={remindersActive ? "page" : undefined}
            onClick={onOpenReminders}
          >
            <IconBell width={24} height={24} strokeWidth={1.6} />
            <span>Rappels</span>
          </button>
          <button
            type="button"
            className="bottom-nav-item tap-target"
            aria-current={rolesActive ? "page" : undefined}
            onClick={onOpenRoles}
          >
            <IconCompass width={24} height={24} strokeWidth={1.6} />
            <span>Approches métier</span>
          </button>
          <button
            type="button"
            className="bottom-nav-item tap-target"
            aria-current={active === "more" ? "page" : undefined}
            onClick={() => onChange("more")}
          >
            <IconMore width={24} height={24} strokeWidth={1.6} />
            <span>Plus</span>
          </button>
        </>
      ) : (
        TABS.map(({ id, label, Icon }) => {
          if (id === "week" && secondTab === "reminders") {
            return (
              <button
                key="reminders"
                type="button"
                className="bottom-nav-item tap-target"
                aria-current={remindersActive ? "page" : undefined}
                onClick={onOpenReminders}
              >
                <IconBell width={24} height={24} strokeWidth={1.6} />
                <span>Rappels</span>
              </button>
            );
          }
          return (
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
          );
        })
      )}

      {isDesktop && (
        <div className="sidebar-workspaces">
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
