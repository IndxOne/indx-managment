import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconBell, IconCalendar, IconGrid, IconMore, IconPlus, IconSun } from "./Icons";

export type NavTab = "today" | "week" | "spaces" | "reminders" | "more";

/**
 * 4 destinations primaires (Accueil, Projets, Cette semaine, Rappels) — même
 * liste sur mobile et desktop, aucune 5e destination permanente dans la
 * barre basse mobile (cadrage renouveau produit, Lot 1.1). L'accès au menu
 * secondaire (Carnet/Hub/Recherche/Réglages/Approches métier) reste visible
 * dans la sidebar desktop (ci-dessous) ; sur mobile il est porté par un
 * bouton "•••" dédié dans l'en-tête global (AppShell), hors de cette barre.
 */
const TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Accueil", Icon: IconSun },
  { id: "spaces", label: "Projets", Icon: IconGrid },
  { id: "week", label: "Cette semaine", Icon: IconCalendar },
  { id: "reminders", label: "Rappels", Icon: IconBell },
];

export function BottomNav({
  active,
  onChange,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /** Liste des espaces affichée dans la barre latérale à partir de 1024px (masquée en CSS sur mobile, cf. .sidebar-workspaces). */
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}) {
  // Rendu conditionnel (pas seulement masqué en CSS) : sur mobile, la liste
  // des espaces vit déjà dans l'onglet "Projets" — la dupliquer dans le DOM
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
        <button
          type="button"
          className="bottom-nav-item tap-target"
          aria-current={active === "more" ? "page" : undefined}
          onClick={() => onChange("more")}
        >
          <IconMore width={24} height={24} strokeWidth={1.6} />
          <span>Plus</span>
        </button>
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
