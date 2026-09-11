import { useEffect, useMemo, useState } from "react";
import type { ActionStatus } from "../domain/types";
import type { Workspace } from "../domain/workspace";
import { AnnouncerProvider } from "./a11y/announcer";
import { TemporaryStoreProvider, useStore } from "./adapters/temporary-store";
import { SupabaseStoreProvider } from "./adapters/supabase-store";
import { isSupabaseConfigured } from "./adapters/supabase/client";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { useSecondTabPreference } from "./hooks/useSecondTabPreference";
import { LoadingState, OfflineBanner } from "./components/StateBlocks";
import { ActionsByStatusScreen } from "./screens/ActionsByStatusScreen";
import { AggregatedActionsScreen } from "./screens/AggregatedActionsScreen";
import { AppSettingsScreen } from "./screens/AppSettingsScreen";
import { ApproachesScreen } from "./screens/ApproachesScreen";
import { ApproachSettingsScreen } from "./screens/ApproachSettingsScreen";
import { CarnetScreen } from "./screens/CarnetScreen";
import { CreateWorkspaceScreen } from "./screens/CreateWorkspaceScreen";
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
  | { screen: "app-settings" };

function routeToTab(route: Route): NavTab {
  switch (route.screen) {
    case "today":
      return "today";
    case "week":
      return "week";
    case "more":
    case "reminders":
    case "carnet":
    case "hub":
    case "roles":
    case "actions-by-status":
    case "search":
    case "app-settings":
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
  const { state, isLoading } = useStore();
  const [route, setRoute] = useState<Route>({ screen: "spaces-list" });
  const [booted, setBooted] = useState(false);
  const online = useOnlineStatus();
  const secondTab = useSecondTabPreference();
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
    if (tab === "spaces") setRoute({ screen: "spaces-list" });
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
      <BottomNav
        active={routeToTab(route)}
        onChange={handleNavChange}
        workspaces={state.workspaces}
        activeWorkspaceId={workspace?.id}
        onSelectWorkspace={goToWorkspaceId}
        onCreateWorkspace={() => setRoute({ screen: "spaces-create" })}
        onOpenReminders={() => setRoute({ screen: "reminders" })}
        remindersActive={route.screen === "reminders"}
        onOpenRoles={() => setRoute({ screen: "roles" })}
        rolesActive={route.screen === "roles"}
        secondTab={secondTab}
      />
      <main className="app-content">
        {!booted || isLoading ? (
          <LoadingState label="Chargement des espaces…" />
        ) : (
          <div key={routeKey} className="route-transition">
        {route.screen === "today" && (
          <AggregatedActionsScreen
            title="Aujourd'hui"
            includeLabels={["today"]}
            emptyDescription="Aucune action prévue aujourd'hui, ni en attente."
            timezone={timezone}
            onNavigateToWorkspace={goToWorkspaceId}
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
          <AppSettingsScreen onNavigate={(destination) => setRoute({ screen: destination })} />
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
      <div className="state-block" role="alert">
        <p>Cet espace est introuvable.</p>
        <button type="button" className="btn tap-target" onClick={onBack}>
          Retour aux espaces
        </button>
      </div>
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
