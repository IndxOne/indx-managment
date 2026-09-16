import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconBell, IconCalendar, IconGrid, IconLayers, IconMore, IconPlus, IconSettings, IconSun } from "./Icons";

export type NavTab = "today" | "run" | "spaces" | "week" | "reminders" | "settings" | "more";

/**
 * Barre basse mobile — renouveau produit v2.2 : 5 destinations fixes
 * (Aujourd'hui, RUN, création rapide au centre, Projets, Réglages). "Cette
 * semaine" et "Rappels", primaires jusqu'ici, rejoignent le menu secondaire
 * (cf. more-links.ts) — toujours joignables (bouton "•••" mobile, ou via
 * Réglages) mais plus dans cette barre. Reshuffle explicite et validé côté
 * produit, pas une régression de couverture.
 */
const MOBILE_TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "run", label: "RUN", Icon: IconLayers },
];

const MOBILE_TABS_TRAILING: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "spaces", label: "Projets", Icon: IconGrid },
  { id: "settings", label: "Réglages", Icon: IconSettings },
];

/**
 * Desktop : sidebar plus généreuse en largeur, on peut se permettre d'y
 * exposer directement toutes les destinations fonctionnelles (pas de geste
 * de swipe pour compenser, pas de bouton central flottant qui aurait
 * moins de sens à la souris) plutôt que de les replier dans "Plus".
 */
const DESKTOP_TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Accueil", Icon: IconSun },
  { id: "run", label: "RUN", Icon: IconLayers },
  { id: "spaces", label: "Projets", Icon: IconGrid },
  { id: "week", label: "Cette semaine", Icon: IconCalendar },
  { id: "reminders", label: "Rappels", Icon: IconBell },
  { id: "settings", label: "Réglages", Icon: IconSettings },
];

export function BottomNav({
  active,
  onChange,
  onQuickAdd,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /**
   * Création rapide (Lot 4, v2.2) : bouton central sur mobile, entrée
   * "Nouvelle action" dans la sidebar desktop. Optionnel pour ne pas casser
   * un appelant qui ne le fournirait pas encore (tests existants).
   */
  onQuickAdd?: () => void;
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
  const tabs = isDesktop ? DESKTOP_TABS : MOBILE_TABS;

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {tabs.map(({ id, label, Icon }) => (
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

      {!isDesktop && onQuickAdd && (
        <button
          type="button"
          className="bottom-nav-item bottom-nav-fab tap-target"
          aria-label="Créer une action ou un projet"
          onClick={onQuickAdd}
        >
          <span className="bottom-nav-fab-circle">
            <IconPlus width={22} height={22} strokeWidth={2.4} />
          </span>
        </button>
      )}

      {!isDesktop &&
        MOBILE_TABS_TRAILING.map(({ id, label, Icon }) => (
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
          {onQuickAdd && (
            <button type="button" className="sidebar-workspace-create tap-target" onClick={onQuickAdd}>
              <IconPlus width={14} height={14} strokeWidth={2} />
              Nouvelle action
            </button>
          )}
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
