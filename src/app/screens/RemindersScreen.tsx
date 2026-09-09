import { useMemo } from "react";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { useStore } from "../adapters/temporary-store";
import { EmptyState } from "../components/StateBlocks";
import { MoreSubNav } from "../components/MoreSubNav";
import type { MoreDestination } from "../more-links";

interface ReminderEntry {
  workspaceName: string;
  workspaceId: string;
  actionId: string;
  title: string;
  afterDays: number;
  due: boolean;
}

/**
 * Vue transversale des relances actives (statut "waiting" + relance
 * activée), tous espaces confondus — la vérification/déclenchement reste
 * du ressort de refreshReminders (par espace), ceci n'est qu'une lecture.
 */
export function RemindersScreen({
  onNavigateToWorkspace,
  onNavigate,
}: {
  onNavigateToWorkspace: (workspaceId: string) => void;
  onNavigate: (destination: MoreDestination) => void;
}) {
  const { state } = useStore();

  const entries = useMemo<ReminderEntry[]>(() => {
    const result: ReminderEntry[] = [];
    for (const workspace of state.workspaces) {
      for (const action of state.actionsByWorkspace[workspace.id] ?? []) {
        if (action.status === "waiting" && action.waitingReminder?.enabled) {
          result.push({
            workspaceName: workspace.name,
            workspaceId: workspace.id,
            actionId: action.id,
            title: action.title,
            afterDays: action.waitingReminder.afterDays,
            due: isWaitingReminderDue(action),
          });
        }
      }
    }
    return result.sort((a, b) => Number(b.due) - Number(a.due));
  }, [state]);

  return (
    <div>
      <div className="top-bar">
        <h1>Rappels</h1>
      </div>
      <MoreSubNav active="reminders" onNavigate={onNavigate} />
      <div className="app-main">
        {entries.length === 0 ? (
          <EmptyState title="Aucune relance active" description="Les actions en attente avec une relance activée apparaîtront ici." />
        ) : (
          <div className="action-card-list">
            {entries.map((entry) => (
              <button
                type="button"
                className="action-card"
                key={entry.actionId}
                style={{ textAlign: "left", width: "100%", border: "none", cursor: "pointer" }}
                onClick={() => onNavigateToWorkspace(entry.workspaceId)}
              >
                <span className="action-title">{entry.title}</span>
                <div className="action-sub">
                  {entry.workspaceName} · Relance après {entry.afterDays} j
                  {entry.due && (
                    <span className="phase-chip phase-chip-orange" style={{ marginLeft: 4 }}>
                      Due
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
