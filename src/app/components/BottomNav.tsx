import type { Workspace } from "../../domain/workspace";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { IconBell, IconCalendar, IconGrid, IconMore, IconPlus, IconSettings, IconSun, IconTray } from "./Icons";

export type NavTab = "today" | "run" | "spaces" | "settings" | "week" | "reminders" | "more";

/**
 * 5 emplacements primaires mobile (cadrage renouveau mobile, Lot A) :
 * Aujourd'hui / RUN / création rapide (bouton central, pas une destination
 * — cf. `onQuickCreate`) / Projets / Réglages. "Cette semaine" et "Rappels"
 * quittent la barre primaire (ils restent joignables depuis le menu
 * secondaire "•••", cf. more-links.ts) — aucune destination n'est perdue,
 * seule sa place change. Même liste de destinations sur desktop (adaptée à
 * la sidebar ci-dessous), jamais de barre mobile "en plus" sur grand écran.
 */
const TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Accueil", Icon: IconSun },
  { id: "run", label: "RUN", Icon: IconTray },
  { id: "spaces", label: "Projets", Icon: IconGrid },
  { id: "settings", label: "Réglages", Icon: IconSettings },
];

const DESKTOP_SECONDARY_TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "week", label: "Cette semaine", Icon: IconCalendar },
  { id: "reminders", label: "Rappels", Icon: IconBell },
];

export function BottomNav({
  active,
  onChange,
  onQuickCreate,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
}: {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  /** Bouton central (mobile) / bouton dédié (sidebar desktop) : ouvre la création rapide globale, jamais un changement de route (cf. AppShell — résolution de l'espace cible par défaut). */
  onQuickCreate: () => void;
  /**
   * Liste des espaces affichée dans la barre latérale à partir de 1024px
   * (masquée en CSS sur mobile, cf. .sidebar-workspaces). Uniquement les
   * Workspace V2 `kind=run` : les `kind=project` sont legacy depuis UX-3
   * (Projets = Project V3 uniquement) et ne doivent jamais apparaître dans
   * la navigation primaire — seul « Anciens espaces projet » (accès legacy
   * discret, ProjectsV3ListScreen) y mène encore, jamais cette sidebar.
   */
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
}) {
  const runWorkspaces = workspaces.filter((workspace) => workspace.kind === "run");
  // Rendu conditionnel (pas seulement masqué en CSS) : sur mobile, la liste
  // des espaces vit déjà dans l'onglet "Projets" — la dupliquer dans le DOM
  // créerait des boutons de même nom accessibles en double (lecteur d'écran,
  // tests). Même seuil que le passage sidebar en CSS (cf. useIsDesktop).
  const isDesktop = useIsDesktop();

  const mobileLeft = TABS.slice(0, 2);
  const mobileRight = TABS.slice(2);

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {isDesktop ? (
        <>
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
          {DESKTOP_SECONDARY_TABS.map(({ id, label, Icon }) => (
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
          <button type="button" className="bottom-nav-item tap-target" aria-current={active === "more" ? "page" : undefined} onClick={() => onChange("more")}>
            <IconMore width={24} height={24} strokeWidth={1.6} />
            <span>Plus</span>
          </button>
        </>
      ) : (
        <>
          {mobileLeft.map(({ id, label, Icon }) => (
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
          <div className="bottom-nav-center">
            <button
              type="button"
              className="bottom-nav-create tap-target"
              aria-label="Créer une action"
              onClick={onQuickCreate}
            >
              <IconPlus width={24} height={24} strokeWidth={2.2} />
            </button>
          </div>
          {mobileRight.map(({ id, label, Icon }) => (
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
        </>
      )}

      {isDesktop && (
        <div className="sidebar-workspaces">
          <button type="button" className="sidebar-quick-create tap-target" onClick={onQuickCreate}>
            <IconPlus width={16} height={16} strokeWidth={2.4} />
            Nouvelle action
          </button>
          <span className="sidebar-workspaces-title">Mes espaces RUN</span>
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
