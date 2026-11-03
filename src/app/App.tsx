import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { BriefSourceType } from "../domain/v3/brief/types";
import type { Workspace } from "../domain/workspace";
import { AnnouncerProvider } from "./a11y/announcer";
import { TemporaryStoreProvider, useStore } from "./adapters/temporary-store";
import { SupabaseStoreProvider } from "./adapters/supabase-store";
import { isSupabaseConfigured } from "./adapters/supabase/client";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { IconChevronRight } from "./components/Icons";
import { ErrorState, LoadingState, OfflineBanner } from "./components/StateBlocks";
import { AggregatedActionsScreen } from "./screens/AggregatedActionsScreen";
import { AppSettingsScreen } from "./screens/AppSettingsScreen";
import { ApproachSettingsScreen } from "./screens/ApproachSettingsScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { BriefLauncherScreen } from "./screens/BriefLauncherScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { CarnetScreen } from "./screens/CarnetScreen";
import { CreateWorkspaceScreen } from "./screens/CreateWorkspaceScreen";
import { FluxScreen } from "./screens/FluxScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ProjectV3Screen } from "./screens/ProjectV3Screen";
import { ProjectsV3ListScreen } from "./screens/ProjectsV3ListScreen";
import { ProjectWorkspaceScreen } from "./screens/ProjectWorkspaceScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { RunHubScreen } from "./screens/RunHubScreen";
import { RunWorkspaceScreen } from "./screens/RunWorkspaceScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { WorkspaceListScreen } from "./screens/WorkspaceListScreen";
import { Composer } from "./components/Composer";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpdatePrompt } from "./components/UpdatePrompt";

type Route =
  | { screen: "today" }
  | { screen: "run" }
  | { screen: "week" }
  | { screen: "projects-v3" }
  | { screen: "spaces-list" }
  | { screen: "spaces-create" }
  | { screen: "workspace-detail"; workspaceId: string }
  | { screen: "workspace-settings"; workspaceId: string }
  | { screen: "more" }
  | { screen: "reminders" }
  | { screen: "carnet" }
  | { screen: "search" }
  | { screen: "app-settings" }
  | { screen: "auth" }
  | { screen: "brief"; projectId?: string }
  | { screen: "project-v3"; projectId: string; focusType?: BriefSourceType; focusId?: string; from?: "projects-v3" };

/**
 * "run"/"settings" sont des routes/onglets primaires à part entière (cadrage
 * renouveau mobile Lot A), mais "workspace-detail"/"workspace-settings" sont
 * partagées entre RUN (ouvert via l'onglet RUN OU via la liste Projets, si
 * plusieurs espaces RUN existent) et PROJET : seule la nature réelle de
 * l'espace ouvert (`workspaceKind`) distingue quel onglet doit rester actif.
 */
function routeToTab(route: Route, workspaceKind: Workspace["kind"] | undefined): NavTab {
  switch (route.screen) {
    case "today":
      return "today";
    case "run":
      return "run";
    case "week":
      return "week";
    case "reminders":
      return "reminders";
    case "workspace-detail":
    case "workspace-settings":
      return workspaceKind === "run" ? "run" : "spaces";
    case "more":
    case "app-settings":
    case "carnet":
    case "search":
    case "auth":
    case "brief":
      return "more";
    case "project-v3":
      // Atteignable depuis Accueil, Projets ou Mon Brief — reste sur
      // "Projets" (sa destination principale désormais, cf. UX-3) plutôt
      // que de toujours retomber sur "Plus".
      return "spaces";
    default:
      return "spaces";
  }
}

/**
 * Route adossée à l'historique du navigateur : le geste/bouton "retour"
 * (Android, iOS, navigateur) revient à l'écran précédent au lieu de quitter
 * l'app. Pas de router externe : pushState/popstate suffisent ici.
 */
function useHistoryRoute(initial: Route): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(initial);

  useEffect(() => {
    window.history.replaceState({ route: initial }, "");
    function onPopState(event: PopStateEvent) {
      const previous = (event.state as { route?: Route } | null)?.route;
      setRoute(previous ?? initial);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // initial est figé au montage (route d'accueil).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState({ route: next }, "");
    withViewTransition(() => setRoute(next));
    // Nouvel écran = haut de page (jsdom n'implémente pas scrollTo).
    document.scrollingElement?.scrollTo?.(0, 0);
  }, []);

  return [route, navigate];
}

/** Transition d'écran native du navigateur (fondu), si disponible et souhaitée. */
function withViewTransition(update: () => void) {
  const start = (document as Document & { startViewTransition?: (callback: () => void) => unknown }).startViewTransition;
  if (!start || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  start.call(document, () => flushSync(update));
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
  const { state, isLoading } = useStore();
  // Accueil (Home) est la route initiale : ouvrir l'app sur ce qui nécessite
  // une action immédiate, pas sur la liste des projets (décision produit
  // validée). HomeScreen (Lot 7) : Aujourd'hui / En retard / Bloqué / Cette
  // semaine (aperçu), au lieu de l'ancien AggregatedActionsScreen générique
  // (toujours utilisé pour la route "week", vue temporelle complète).
  const [route, setRoute] = useHistoryRoute({ screen: "today" });
  const [booted, setBooted] = useState(false);
  const online = useOnlineStatus();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

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

  function handleNavChange(tab: NavTab) {
    // Onglet "Projets" ouvre désormais directement la vue Project V3
    // (décision d'architecture UX-3) — l'ancienne liste Workspace V2
    // ("spaces-list") reste joignable via le lien "Anciens espaces projet"
    // de ProjectsV3ListScreen, jamais depuis la barre de navigation.
    if (tab === "spaces") setRoute({ screen: "projects-v3" });
    else setRoute({ screen: tab });
  }

  const workspace =
    route.screen === "workspace-detail" || route.screen === "workspace-settings"
      ? state.workspaces.find((candidate) => candidate.id === route.workspaceId)
      : undefined;

  const activeTab = routeToTab(route, workspace?.kind);
  const routeKey = "workspaceId" in route ? `${route.screen}:${route.workspaceId}` : route.screen;

  return (
    <div className="app-shell">
      {!online && <OfflineBanner />}
      <BottomNav
        active={activeTab}
        onChange={handleNavChange}
        workspaces={state.workspaces}
        activeWorkspaceId={workspace?.id}
        onSelectWorkspace={goToWorkspaceId}
      />
      <UpdatePrompt />
      {!isLoading && <Composer timezone={timezone} />}
      <main className="app-content" id="contenu">
        {!booted || isLoading ? (
          <LoadingState label="Chargement…" />
        ) : (
          <div key={routeKey} className="route-transition">
        {route.screen === "today" && (
          <FluxScreen timezone={timezone} onNavigateToWorkspace={goToWorkspaceId} />
        )}

        {route.screen === "run" && (
          <RunHubScreen
            timezone={timezone}
            onOpenSettings={(workspaceId) => setRoute({ screen: "workspace-settings", workspaceId })}
            onNavigateToWorkspace={goToWorkspaceId}
            onCreateRun={() => setRoute({ screen: "spaces-create" })}
          />
        )}

        {route.screen === "week" && (
          <AggregatedActionsScreen
            title="Cette semaine"
            includeLabels={["today", "tomorrow", "this_week"]}
            emptyDescription="Aucune action prévue cette semaine, ni en attente."
            timezone={timezone}
            onNavigateToWorkspace={goToWorkspaceId}
            onBack={() => setRoute({ screen: "today" })}
          />
        )}

        {route.screen === "projects-v3" && (
          <ProjectsV3ListScreen
            onOpenProject={(projectId) => setRoute({ screen: "project-v3", projectId, from: "projects-v3" })}
            onOpenLegacy={() => setRoute({ screen: "spaces-list" })}
            onOpenAuth={() => setRoute({ screen: "auth" })}
          />
        )}

        {route.screen === "spaces-list" && (
          <WorkspaceListScreen
            timezone={timezone}
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
          <RemindersScreen timezone={timezone} onNavigateToWorkspace={goToWorkspaceId} />
        )}

        {route.screen === "carnet" && (
          <CarnetScreen />
        )}


        {route.screen === "search" && (
          <SearchScreen timezone={timezone} onNavigateToWorkspace={goToWorkspaceId} />
        )}

        {route.screen === "brief" &&
          (route.projectId ? (
            <BriefScreen
              projectId={route.projectId}
              onBack={() => setRoute({ screen: "more" })}
              onOpenItem={(item) =>
                setRoute({ screen: "project-v3", projectId: item.projectId, focusType: item.sourceType, focusId: item.sourceId })
              }
              onOpenAuth={() => setRoute({ screen: "auth" })}
            />
          ) : (
            <BriefLauncherScreen
              onBack={() => setRoute({ screen: "more" })}
              onOpenItem={(item) =>
                setRoute({ screen: "project-v3", projectId: item.projectId, focusType: item.sourceType, focusId: item.sourceId })
              }
              onOpenAuth={() => setRoute({ screen: "auth" })}
            />
          ))}

        {route.screen === "project-v3" && (
          <ProjectV3Screen
            projectId={route.projectId}
            focusType={route.focusType}
            focusId={route.focusId}
            onBack={() => setRoute(route.from === "projects-v3" ? { screen: "projects-v3" } : { screen: "more" })}
            onOpenBrief={(projectId) => setRoute({ screen: "brief", projectId })}
            onOpenAuth={() => setRoute({ screen: "auth" })}
          />
        )}

        {route.screen === "app-settings" && (
          <AppSettingsScreen onOpenAuth={() => setRoute({ screen: "auth" })} />
        )}

        {route.screen === "auth" && (
          <div>
            <div className="top-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => window.history.back()}
                  aria-label="Retour"
                >
                  <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
                </button>
                <h1>Connexion</h1>
              </div>
            </div>
            <div className="app-main">
              <div className="settings-section">
                <AuthScreen />
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </main>

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

/** Mode local (sans backend configuré) : données conservées sur l'appareil. */
export const LOCAL_STATE_KEY = "indxone-local-state-v1";

export function App() {
  return (
    <ErrorBoundary>
      <AnnouncerProvider>
        <ToastProvider>
          {isSupabaseConfigured() ? (
            <SupabaseStoreProvider>
              <AppShell />
            </SupabaseStoreProvider>
          ) : (
            <TemporaryStoreProvider persistKey={LOCAL_STATE_KEY}>
              <AppShell />
            </TemporaryStoreProvider>
          )}
        </ToastProvider>
      </AnnouncerProvider>
    </ErrorBoundary>
  );
}
