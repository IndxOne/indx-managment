import { useEffect, useMemo, useState } from "react";
import type { ActionStatus } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { AnnouncerProvider } from "./a11y/announcer";
import { TemporaryStoreProvider, useStore } from "./adapters/temporary-store";
import { SupabaseStoreProvider } from "./adapters/supabase-store";
import { isSupabaseConfigured } from "./adapters/supabase/client";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { IconChevronRight, IconMore } from "./components/Icons";
import { ErrorState, LoadingState, OfflineBanner } from "./components/StateBlocks";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { ActionsByStatusScreen } from "./screens/ActionsByStatusScreen";
import { AggregatedActionsScreen } from "./screens/AggregatedActionsScreen";
import { AppSettingsScreen } from "./screens/AppSettingsScreen";
import { ApproachesScreen } from "./screens/ApproachesScreen";
import { ApproachSettingsScreen } from "./screens/ApproachSettingsScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { BriefLauncherScreen } from "./screens/BriefLauncherScreen";
import { CarnetScreen } from "./screens/CarnetScreen";
import { CreateWorkspaceScreen } from "./screens/CreateWorkspaceScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { HubScreen } from "./screens/HubScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { ProjectWorkspaceScreen } from "./screens/ProjectWorkspaceScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { RunHubScreen } from "./screens/RunHubScreen";
import { RunWorkspaceScreen } from "./screens/RunWorkspaceScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { WorkspaceListScreen } from "./screens/WorkspaceListScreen";
import { QuickCreateSheet } from "./components/QuickCreateSheet";
import { ToastProvider, useToast } from "./components/Toast";

type Route =
  | { screen: "today" }
  | { screen: "run" }
  | { screen: "week" }
  | { screen: "spaces-list" }
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
  | { screen: "auth" }
  | { screen: "brief" };

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
    case "app-settings":
      return "settings";
    case "workspace-detail":
    case "workspace-settings":
      return workspaceKind === "run" ? "run" : "spaces";
    case "more":
    case "carnet":
    case "hub":
    case "roles":
    case "actions-by-status":
    case "search":
    case "auth":
    case "brief":
      return "more";
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
  const { state, isLoading, createAction } = useStore();
  const { showToast } = useToast();
  // Accueil (Home) est la route initiale : ouvrir l'app sur ce qui nécessite
  // une action immédiate, pas sur la liste des projets (décision produit
  // validée). HomeScreen (Lot 7) : Aujourd'hui / En retard / Bloqué / Cette
  // semaine (aperçu), au lieu de l'ancien AggregatedActionsScreen générique
  // (toujours utilisé pour la route "week", vue temporelle complète).
  const [route, setRoute] = useState<Route>({ screen: "today" });
  const [booted, setBooted] = useState(false);
  const online = useOnlineStatus();
  // Sur desktop, l'accès au menu secondaire vit dans la sidebar de BottomNav
  // (bouton "Plus" existant) : le bouton d'en-tête ci-dessous est réservé au
  // mobile, où la barre basse est strictement limitée à 4 destinations
  // (cadrage renouveau produit, Lot 1.1).
  const isDesktop = useIsDesktop();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  // Bouton central de création rapide (Lot B) : ouvre le sélecteur "Que
  // voulez-vous créer ?" (QuickCreateSheet), qui choisit lui-même la
  // destination (RUN / Projet / nouvel espace) avant de déléguer la création
  // à AddActionSheet + useStore().createAction, jamais un bouton mort.
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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
    if (tab === "spaces") setRoute({ screen: "spaces-list" });
    else if (tab === "settings") setRoute({ screen: "app-settings" });
    else setRoute({ screen: tab });
  }

  function openQuickCreate() {
    // Aucun espace du tout : rien à créer dedans, on envoie directement vers
    // la création d'espace plutôt que d'ouvrir un sélecteur sans cible
    // possible (jamais un bouton qui ne fait rien).
    if (state.workspaces.length === 0) {
      setRoute({ screen: "spaces-create" });
      return;
    }
    setQuickCreateOpen(true);
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
      {!isDesktop && (
        <button
          type="button"
          className="app-more-trigger tap-target"
          aria-label="Menu secondaire : Rappels, Cette semaine, Carnet, Hub, Approches métier, Recherche, Mon Brief"
          aria-current={activeTab === "more" ? "page" : undefined}
          onClick={() => setRoute({ screen: "more" })}
        >
          <IconMore width={20} height={20} strokeWidth={1.8} />
        </button>
      )}
      <BottomNav
        active={activeTab}
        onChange={handleNavChange}
        onQuickCreate={openQuickCreate}
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
            onQuickCreate={openQuickCreate}
          />
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

        {route.screen === "brief" && <BriefLauncherScreen onBack={() => setRoute({ screen: "more" })} />}

        {route.screen === "app-settings" && (
          <AppSettingsScreen
            onNavigate={(destination) => setRoute({ screen: destination })}
            onOpenAuth={() => setRoute({ screen: "auth" })}
          />
        )}

        {route.screen === "auth" && (
          <div>
            <div className="top-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => setRoute({ screen: "app-settings" })}
                  aria-label="Retour aux réglages"
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

      {quickCreateOpen && (
        <QuickCreateSheet
          workspaces={state.workspaces}
          membersByWorkspace={state.membersByWorkspace ?? {}}
          onCancel={() => setQuickCreateOpen(false)}
          onCreateProject={() => {
            setQuickCreateOpen(false);
            setRoute({ screen: "spaces-create" });
          }}
          onCreateAction={(targetWorkspace, input) => {
            // Pas de répétition depuis la création rapide globale : seul le
            // formulaire complet d'un espace (Run/ProjectWorkspaceScreen) la
            // propose (comportement inchangé depuis le Lot A).
            createAction({
              workspaceId: targetWorkspace.id,
              title: input.title,
              itemType: input.itemType,
              priority: input.priority,
              phaseId: input.phaseId,
              schedule: input.schedule,
              assigneeIds: input.assigneeIds,
            });
            setQuickCreateOpen(false);
            showToast(`« ${input.title} » créée dans ${targetWorkspace.name}.`);
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
      <ToastProvider>
        <StoreProviderImpl>
          <AppShell />
        </StoreProviderImpl>
      </ToastProvider>
    </AnnouncerProvider>
  );
}
