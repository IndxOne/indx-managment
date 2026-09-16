import { useEffect, useMemo, useState } from "react";
import type { ActionStatus } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { AnnouncerProvider } from "./a11y/announcer";
import { TemporaryStoreProvider, useStore } from "./adapters/temporary-store";
import { SupabaseStoreProvider } from "./adapters/supabase-store";
import { isSupabaseConfigured } from "./adapters/supabase/client";
import { AddActionSheet } from "./components/AddActionSheet";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { IconMore } from "./components/Icons";
import { ErrorState, LoadingState, OfflineBanner } from "./components/StateBlocks";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { ActionsByStatusScreen } from "./screens/ActionsByStatusScreen";
import { AggregatedActionsScreen } from "./screens/AggregatedActionsScreen";
import { AppSettingsScreen } from "./screens/AppSettingsScreen";
import { ApproachesScreen } from "./screens/ApproachesScreen";
import { ApproachSettingsScreen } from "./screens/ApproachSettingsScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { CarnetScreen } from "./screens/CarnetScreen";
import { CreateWorkspaceScreen } from "./screens/CreateWorkspaceScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { HubScreen } from "./screens/HubScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ProjectWorkspaceScreen } from "./screens/ProjectWorkspaceScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { RunWorkspaceScreen } from "./screens/RunWorkspaceScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { WorkspaceListScreen } from "./screens/WorkspaceListScreen";

type Route =
  | { screen: "today" }
  | { screen: "week" }
  /** kindFilter="run" : liste restreinte aux espaces RUN (onglet "RUN" de la barre basse quand il en existe plusieurs, cf. handleNavChange). Absent = comportement inchangé (tous les espaces). */
  | { screen: "spaces-list"; kindFilter?: Workspace["kind"] }
  | { screen: "spaces-create" }
  | { screen: "workspace-detail"; workspaceId: string }
  | { screen: "workspace-settings"; workspaceId: string }
  | { screen: "more" }
  | { screen: "reminders" }
  | { screen: "carnet" }
  | { screen: "hub" }
  | { screen: "roles" }
  | { screen: "actions-by-status"; status: ActionStatus }
  | { screen: "search" }
  | { screen: "app-settings" }
  | { screen: "auth" };

/**
 * L'onglet actif dépend parfois du genre de l'espace ouvert (un
 * `workspace-detail` sur un espace RUN doit surligner "RUN", pas "Projets")
 * — d'où le second paramètre, absent quand la route ne porte pas d'espace.
 */
function routeToTab(route: Route, workspaceKind?: Workspace["kind"]): NavTab {
  switch (route.screen) {
    case "today":
      return "today";
    case "week":
      return "week";
    case "reminders":
      return "reminders";
    case "app-settings":
    case "auth":
      // Réglages n'est plus une destination primaire de BottomNav (retour au
      // menu secondaire, cf. more-links.ts) : sur mobile, c'est le
      // déclencheur "•••" qui doit paraître actif ici, pas un onglet dédié
      // qui n'existe plus dans la barre.
      return "more";
    case "more":
    case "carnet":
    case "hub":
    case "roles":
    case "actions-by-status":
    case "search":
      return "more";
    case "workspace-detail":
    case "workspace-settings":
      return workspaceKind === "run" ? "run" : "spaces";
    case "spaces-list":
      return route.kindFilter === "run" ? "run" : "spaces";
    default:
      return "spaces";
  }
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const setTrue = () => setOnline(true);
    const setFalse = () => setOnline(false);
    window.addEventListener("online", setTrue);
    window.addEventListener("offline", setFalse);
    return () => {
      window.removeEventListener("online", setTrue);
      window.removeEventListener("offline", setFalse);
    };
  }, []);
  return online;
}

function AppShell() {
  const { state, isLoading, createAction, createRecurringRule } = useStore();
  // Accueil (Home) est la route initiale : ouvrir l'app sur ce qui nécessite
  // une action immédiate, pas sur la liste des projets (décision produit
  // validée). HomeScreen (Lot 7) : Aujourd'hui / En retard / Bloqué / Cette
  // semaine (aperçu), au lieu de l'ancien AggregatedActionsScreen générique
  // (toujours utilisé pour la route "week", vue temporelle complète).
  const [route, setRoute] = useState<Route>({ screen: "today" });
  const [booted, setBooted] = useState(false);
  const online = useOnlineStatus();
  // Sur desktop, l'accès au menu secondaire vit dans la sidebar de BottomNav
  // (bouton "Plus" existant) : le bouton d'en-tête ci-dessous ("•••") reste
  // réservé au mobile, où la barre basse est strictement limitée à 5
  // destinations (Aujourd'hui/RUN/création rapide/Projets/Réglages,
  // renouveau produit v2.2) — Carnet/Hub/Approches métier/Recherche restent
  // joignables par ce bouton, sans jamais rejoindre la barre basse.
  const isDesktop = useIsDesktop();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Porte de démarrage minimale : évite un flash de contenu avant le
  // premier rendu committé (état "chargement" honnête, sans donnée fictive).
  useEffect(() => {
    setBooted(true);
  }, []);

  function goToWorkspace(workspace: Workspace) {
    setRoute({ screen: "workspace-detail", workspaceId: workspace.id });
  }

  function goToWorkspaceId(workspaceId: string) {
    setRoute({ screen: "workspace-detail", workspaceId });
  }

  /**
   * Onglet "RUN" (v2.2) : va directement sur l'unique espace RUN s'il n'y
   * en a qu'un ; sinon (0 ou plusieurs) ouvre la liste des espaces filtrée
   * sur RUN — jamais de perte d'accès dans le cas 0 (état vide + CTA
   * création, cf. WorkspaceListScreen) ni dans le cas multi-RUN (liste
   * complète, un tap pour choisir).
   */
  function handleNavChange(tab: NavTab) {
    if (tab === "spaces") setRoute({ screen: "spaces-list" });
    else if (tab === "run") {
      const runWorkspaces = state.workspaces.filter((candidate) => candidate.kind === "run");
      const [onlyRunWorkspace] = runWorkspaces;
      if (runWorkspaces.length === 1 && onlyRunWorkspace) {
        setRoute({ screen: "workspace-detail", workspaceId: onlyRunWorkspace.id });
      } else {
        setRoute({ screen: "spaces-list", kindFilter: "run" });
      }
    } else if (tab === "settings") setRoute({ screen: "app-settings" });
    else setRoute({ screen: tab });
  }

  const workspace =
    route.screen === "workspace-detail" || route.screen === "workspace-settings"
      ? state.workspaces.find((candidate) => candidate.id === route.workspaceId)
      : undefined;

  const routeKey = "workspaceId" in route ? `${route.screen}:${route.workspaceId}` : route.screen;

  return (
    <div className="app-shell">
      {!online && <OfflineBanner />}
      {!isDesktop && (
        <button
          type="button"
          className="app-more-trigger tap-target"
          aria-label="Menu secondaire : Carnet, Hub, Approches métier, Recherche, Réglages"
          aria-current={routeToTab(route) === "more" ? "page" : undefined}
          onClick={() => setRoute({ screen: "more" })}
        >
          <IconMore width={20} height={20} strokeWidth={1.8} />
        </button>
      )}
      <BottomNav
        active={routeToTab(route, workspace?.kind)}
        onChange={handleNavChange}
        onQuickAdd={() => setQuickAddOpen(true)}
        workspaces={state.workspaces}
        activeWorkspaceId={workspace?.id}
        onSelectWorkspace={goToWorkspaceId}
        onCreateWorkspace={() => setRoute({ screen: "spaces-create" })}
      />
      <main className="app-content">
        {!booted || isLoading ? (
          <LoadingState label="Chargement des espaces…" />
        ) : (
          <div key={routeKey} className="route-transition">
        {route.screen === "today" && (
          <HomeScreen
            timezone={timezone}
            onNavigateToWorkspace={goToWorkspaceId}
            onOpenWeek={() => setRoute({ screen: "week" })}
            onOpenRun={() => handleNavChange("run")}
            onQuickAdd={() => setQuickAddOpen(true)}
          />
        )}

        {route.screen === "week" && (
          <AggregatedActionsScreen
            title="Cette semaine"
            includeLabels={["today", "tomorrow", "this_week"]}
            emptyDescription="Aucune action prévue cette semaine, ni en attente."
            timezone={timezone}
            onNavigateToWorkspace={goToWorkspaceId}
          />
        )}

        {route.screen === "spaces-list" && (
          <WorkspaceListScreen
            timezone={timezone}
            kindFilter={route.kindFilter}
            onSelect={goToWorkspace}
            onCreate={() => setRoute({ screen: "spaces-create" })}
          />
        )}

        {route.screen === "spaces-create" && (
          <CreateWorkspaceScreen onCreated={goToWorkspace} onCancel={() => setRoute({ screen: "spaces-list" })} />
        )}

        {route.screen === "workspace-detail" &&
          (workspace ? (
            workspace.kind === "run" ? (
              <RunWorkspaceScreen
                workspace={workspace}
                timezone={timezone}
                onOpenSettings={() => setRoute({ screen: "workspace-settings", workspaceId: workspace.id })}
                onNavigateToWorkspace={goToWorkspaceId}
              />
            ) : (
              <ProjectWorkspaceScreen
                workspace={workspace}
                timezone={timezone}
                onOpenSettings={() => setRoute({ screen: "workspace-settings", workspaceId: workspace.id })}
                onNavigateToWorkspace={goToWorkspaceId}
              />
            )
          ) : (
            <WorkspaceNotFound onBack={() => setRoute({ screen: "spaces-list" })} />
          ))}

        {route.screen === "workspace-settings" &&
          (workspace ? (
            <ApproachSettingsScreen
              workspace={workspace}
              onDone={() => setRoute({ screen: "workspace-detail", workspaceId: workspace.id })}
            />
          ) : (
            <WorkspaceNotFound onBack={() => setRoute({ screen: "spaces-list" })} />
          ))}

        {route.screen === "more" && <MoreScreen onSelect={(destination) => setRoute({ screen: destination })} />}

        {route.screen === "reminders" && (
          <RemindersScreen
            timezone={timezone}
            onNavigateToWorkspace={goToWorkspaceId}
            onNavigate={(destination) => setRoute({ screen: destination })}
          />
        )}

        {route.screen === "carnet" && (
          <CarnetScreen onNavigate={(destination) => setRoute({ screen: destination })} />
        )}

        {route.screen === "hub" && (
          <HubScreen
            onNavigate={(destination) => setRoute({ screen: destination })}
            onOpenSpaces={() => setRoute({ screen: "spaces-list" })}
            onOpenStatus={(status) => setRoute({ screen: "actions-by-status", status })}
          />
        )}

        {route.screen === "roles" && (
          <ApproachesScreen onNavigate={(destination) => setRoute({ screen: destination })} />
        )}

        {route.screen === "actions-by-status" && (
          <ActionsByStatusScreen
            status={route.status}
            timezone={timezone}
            onBack={() => setRoute({ screen: "hub" })}
            onNavigateToWorkspace={goToWorkspaceId}
          />
        )}

        {route.screen === "search" && (
          <SearchScreen
            timezone={timezone}
            onNavigate={(destination) => setRoute({ screen: destination })}
            onNavigateToWorkspace={goToWorkspaceId}
          />
        )}

        {route.screen === "app-settings" && (
          <AppSettingsScreen
            onNavigate={(destination) => setRoute({ screen: destination })}
            onOpenAuth={() => setRoute({ screen: "auth" })}
          />
        )}

        {route.screen === "auth" && (
          <div>
            <div className="top-bar">
              <h1>Connexion</h1>
            </div>
            <div className="app-main">
              <AuthScreen />
              <button
                type="button"
                className="btn btn-block tap-target"
                style={{ marginTop: 16 }}
                onClick={() => setRoute({ screen: "app-settings" })}
              >
                Retour aux réglages
              </button>
            </div>
          </div>
        )}
          </div>
        )}
      </main>

      {quickAddOpen && (
        <AddActionSheet
          workspaceOptions={state.workspaces.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            kind: candidate.kind,
          }))}
          onCancel={() => setQuickAddOpen(false)}
          onCreate={({ repeat, workspaceId, dueDate, ...input }) => {
            if (!workspaceId) return;
            if (repeat) {
              createRecurringRule({ workspaceId, ...input, ...repeat });
            } else {
              createAction({ workspaceId, ...input, schedule: dueDate ? { granularity: "day", value: dueDate } : undefined });
            }
            setQuickAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

function WorkspaceNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="app-main">
      <ErrorState title="Cet espace est introuvable." onRetry={onBack} retryLabel="Retour aux espaces" />
    </div>
  );
}

export function App() {
  const StoreProviderImpl = isSupabaseConfigured() ? SupabaseStoreProvider : TemporaryStoreProvider;
  return (
    <AnnouncerProvider>
      <StoreProviderImpl>
        <AppShell />
      </StoreProviderImpl>
    </AnnouncerProvider>
  );
}
