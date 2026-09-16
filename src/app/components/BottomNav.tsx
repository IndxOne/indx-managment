import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconGrid, IconLayers, IconMore, IconPlus, IconSun } from "./Icons";

export type NavTab = "today" | "run" | "spaces" | "week" | "reminders" | "settings" | "more";

/**
 * Barre basse mobile — réalignement sur le prototype exact (v2.2) : 3
 * destinations fixes (Aujourd'hui, RUN, Projets), comme `tab-today` /
 * `tab-run` / `tab-projects` du prototype. Plus de bouton central de
 * création (remplacé par le "+ Créer" contextuel de l'écran Aujourd'hui) ni
 * de Réglages primaire (retourne dans le menu secondaire "•••", cf.
 * more-links.ts — c'était déjà sa place avant ce lot, restauré tel quel).
 */
const MOBILE_TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "run", label: "RUN", Icon: IconLayers },
  { id: "spaces", label: "Projets", Icon: IconGrid },
];

/**
 * Desktop : sidebar plus généreuse en largeur, mêmes 3 destinations que le
 * prototype (`desk-nav-today/run/projects`) — "Cette semaine"/"Rappels"
 * restent joignables via "Plus", pas dans la nav primaire.
 */
const DESKTOP_TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "run", label: "RUN", Icon: IconLayers },
  { id: "spaces", label: "Projets", Icon: IconGrid },
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
   * Création rapide (v2.2, réalignement prototype) : sur desktop, bouton
   * "+ Nouvelle tâche" épinglé en bas de la sidebar (équivalent du bouton
   * hors `<main>` du prototype). Sur mobile, le déclencheur vit désormais
   * dans l'en-tête de l'écran "Aujourd'hui" (cf. HomeScreen), plus dans
   * cette barre — `onQuickAdd` n'a donc d'effet qu'en desktop ici.
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

      {/* "+ Nouvelle tâche" (prototype : bouton pinné hors <main>, mt-auto) :
          toujours visible en bas de la sidebar quel que soit l'écran actif,
          ouvre la même création rapide globale que le "+ Créer" mobile. */}
      {isDesktop && onQuickAdd && (
        <button type="button" className="sidebar-quick-create tap-target" onClick={onQuickAdd}>
          <IconPlus width={16} height={16} strokeWidth={2.2} />
          Nouvelle tâche
        </button>
      )}
    </nav>
  );
}
