import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { CreateWorkspaceInput } from "../../domain/workspace";
import { createWorkspace } from "../../domain/workspace";
import { defaultMaterializationWindow, generateRecurringOccurrences } from "../../recurrence/recurrence-engine";
import { appReducer, buildRecurrenceRule, generateId, type AppEvent } from "./app-reducer";
import { getSupabaseClient } from "./supabase/client";
import {
  actionFromRow,
  actionToRow,
  carnetNoteFromRow,
  carnetNoteToRow,
  recurrenceRuleFromRow,
  recurrenceRuleToRow,
  workspaceFromRow,
  workspaceToRow,
  type ActionRow,
  type CarnetNoteRow,
  type RecurrenceRuleRow,
  type WorkspaceRow,
} from "./supabase/mappers";
import { getOrCreateUserHash } from "./supabase/user-hash";
import { StoreContext, EMPTY_STATE, type AppState, type StoreContextValue } from "./store-context";

/**
 * ADAPTATEUR SUPABASE (Lot 5) — persistance réelle.
 *
 * Isolation par en-tête `x-user-hash` (même mécanisme que la table
 * sync_snapshots déjà en place dans ce projet), pas par Supabase Auth :
 * pas d'écran de connexion, mais la garantie est celle d'un secret partagé
 * (comme une clé d'API), pas d'une identité signée JWT. Suffisant pour un
 * outil personnel/solo ; à revoir si le produit doit un jour accueillir
 * plusieurs utilisateurs non éditeurs de confiance.
 *
 * Stratégie MVP : lecture complète à l'ouverture, écritures optimistes
 * (l'UI applique le même réducteur pur que l'adaptateur mémoire, puis
 * l'événement est répliqué vers Supabase en arrière-plan). Pas de
 * réconciliation automatique en cas d'échec réseau : l'erreur est
 * affichée, l'utilisateur peut réessayer son action. Pas de Realtime
 * (mono-utilisateur/mono-onglet pour l'instant).
 */

type SyncStatus = "loading" | "ready" | "error";

export function SupabaseStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, EMPTY_STATE);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);

  const client = useMemo(() => getSupabaseClient(), []);
  const userHash = useMemo(() => getOrCreateUserHash(), []);

  const load = useCallback(async () => {
    setStatus("loading");
    setSyncError(null);
    try {
      const [
        { data: workspaceRows, error: workspacesError },
        { data: actionRows, error: actionsError },
        { data: recurrenceRuleRows, error: recurrenceRulesError },
        { data: carnetNoteRows, error: carnetNotesError },
      ] = await Promise.all([
        client.from("projets_workspaces").select("*").order("created_at"),
        client.from("projets_actions").select("*").order("created_at"),
        client.from("projets_recurrence_rules").select("*").order("created_at"),
        client.from("projets_carnet_notes").select("*").order("created_at"),
      ]);
      if (workspacesError) throw workspacesError;
      if (actionsError) throw actionsError;
      if (recurrenceRulesError) throw recurrenceRulesError;
      if (carnetNotesError) throw carnetNotesError;

      const workspaces = ((workspaceRows ?? []) as WorkspaceRow[]).map(workspaceFromRow);
      const actionsByWorkspace: AppState["actionsByWorkspace"] = {};
      const recurrenceRulesByWorkspace: AppState["recurrenceRulesByWorkspace"] = {};
      for (const workspace of workspaces) {
        actionsByWorkspace[workspace.id] = [];
        recurrenceRulesByWorkspace[workspace.id] = [];
      }
      for (const row of (actionRows ?? []) as ActionRow[]) {
        const action = actionFromRow(row);
        (actionsByWorkspace[action.workspaceId] ??= []).push(action);
      }
      for (const row of (recurrenceRuleRows ?? []) as RecurrenceRuleRow[]) {
        const rule = recurrenceRuleFromRow(row);
        (recurrenceRulesByWorkspace[rule.workspaceId] ??= []).push(rule);
      }
      const carnetNotes = ((carnetNoteRows ?? []) as CarnetNoteRow[]).map(carnetNoteFromRow);

      dispatch({ type: "hydrate", state: { workspaces, actionsByWorkspace, recurrenceRulesByWorkspace, carnetNotes } });
      setStatus("ready");
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : "Erreur de chargement Supabase");
      setStatus("error");
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  /** Applique localement puis réplique vers Supabase ; erreur affichée sans annuler l'UI locale. */
  const dispatchAndPersist = useCallback(
    (event: AppEvent, persist: () => Promise<void>) => {
      dispatch(event);
      persist().catch((cause) => {
        setSyncError(
          `Synchronisation Supabase échouée : ${cause instanceof Error ? cause.message : "erreur inconnue"}`
        );
      });
    },
    []
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      createWorkspaceAction: (input) => {
        const withId: CreateWorkspaceInput = {
          ...input,
          id: generateId(),
          now: input.now ?? new Date().toISOString(),
        };
        const workspace = createWorkspace(withId);
        dispatchAndPersist({ type: "workspace/create", input: withId }, async () => {
          const { error } = await client.from("projets_workspaces").insert(workspaceToRow(workspace, userHash));
          if (error) throw error;
        });
        return workspace;
      },

      changeApproach: (workspaceId, approach) => {
        dispatchAndPersist({ type: "workspace/changeApproach", workspaceId, approach }, async () => {
          const { error } = await client
            .from("projets_workspaces")
            .update({ approach, updated_at: new Date().toISOString() })
            .eq("id", workspaceId);
          if (error) throw error;
        });
      },

      createAction: (input) => {
        const id = generateId();
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "action/create", input, id, now }, async () => {
          const row = actionToRow(
            {
              id,
              workspaceId: input.workspaceId,
              title: input.title,
              status: input.status ?? "todo",
              priority: input.priority,
              itemType: input.itemType,
              phaseId: input.phaseId,
              sourceNoteId: input.sourceNoteId,
              schedule: { granularity: "none" },
              assigneeIds: [],
              tags: [],
              createdAt: now,
              updatedAt: now,
            },
            userHash
          );
          const { error } = await client.from("projets_actions").insert(row);
          if (error) throw error;
        });
      },

      createCarnetNote: (text) => {
        const note = { id: generateId(), text, createdAt: new Date().toISOString() };
        dispatchAndPersist({ type: "carnet/create", note }, async () => {
          const { error } = await client.from("projets_carnet_notes").insert(carnetNoteToRow(note, userHash));
          if (error) throw error;
        });
        return note;
      },

      deleteCarnetNote: (noteId) => {
        dispatchAndPersist({ type: "carnet/delete", noteId }, async () => {
          const { error } = await client.from("projets_carnet_notes").delete().eq("id", noteId);
          if (error) throw error;
        });
      },

      convertCarnetNote: (noteId, input) => {
        const id = generateId();
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "carnet/convert", noteId, input, id, now }, async () => {
          const row = actionToRow(
            {
              id,
              workspaceId: input.workspaceId,
              title: input.title,
              status: input.status ?? "todo",
              priority: input.priority,
              itemType: input.itemType,
              phaseId: input.phaseId,
              sourceNoteId: noteId,
              schedule: { granularity: "none" },
              assigneeIds: [],
              tags: [],
              createdAt: now,
              updatedAt: now,
            },
            userHash
          );
          const { error: insertError } = await client.from("projets_actions").insert(row);
          if (insertError) throw insertError;
          const { error: deleteError } = await client.from("projets_carnet_notes").delete().eq("id", noteId);
          if (deleteError) throw deleteError;
        });
      },

      createRecurringRule: (input) => {
        const rule = buildRecurrenceRule(input);
        const today = new Date().toISOString().slice(0, 10);
        const window = defaultMaterializationWindow(rule, today);
        dispatchAndPersist({ type: "recurrence/create", rule, window }, async () => {
          const { error: ruleError } = await client
            .from("projets_recurrence_rules")
            .insert(recurrenceRuleToRow(rule, userHash));
          if (ruleError) throw ruleError;

          const occurrences = generateRecurringOccurrences(rule, window);
          if (occurrences.length > 0) {
            const { error } = await client
              .from("projets_actions")
              .insert(occurrences.map((occurrence) => actionToRow(occurrence, userHash)));
            if (error) throw error;
          }
        });
        return rule;
      },

      deleteRecurringRule: (workspaceId, ruleId) => {
        const today = new Date().toISOString().slice(0, 10);
        const before = state.actionsByWorkspace[workspaceId] ?? [];
        dispatchAndPersist({ type: "recurrence/delete", workspaceId, ruleId, today }, async () => {
          const after =
            appReducer(state, { type: "recurrence/delete", workspaceId, ruleId, today }).actionsByWorkspace[
              workspaceId
            ] ?? [];
          const remainingIds = new Set(after.map((action) => action.id));
          const removedIds = before.filter((action) => !remainingIds.has(action.id)).map((action) => action.id);
          if (removedIds.length > 0) {
            const { error } = await client.from("projets_actions").delete().in("id", removedIds);
            if (error) throw error;
          }
          const { error: ruleError } = await client.from("projets_recurrence_rules").delete().eq("id", ruleId);
          if (ruleError) throw ruleError;
        });
      },

      moveActionEvent: (workspaceId, actionId, destination) => {
        dispatchAndPersist({ type: "action/move", workspaceId, actionId, destination }, async () => {
          const moved = appReducer(state, { type: "action/move", workspaceId, actionId, destination })
            .actionsByWorkspace[workspaceId]?.find((a) => a.id === actionId);
          if (!moved) return;
          const { error } = await client.from("projets_actions").update(actionToRow(moved, userHash)).eq("id", actionId);
          if (error) throw error;
        });
      },

      restoreAction: (workspaceId, action) => {
        dispatchAndPersist({ type: "action/restore", workspaceId, action }, async () => {
          const { error } = await client.from("projets_actions").update(actionToRow(action, userHash)).eq("id", action.id);
          if (error) throw error;
        });
      },

      setReminder: (workspaceId, actionId, afterDays) => {
        dispatchAndPersist({ type: "action/setReminder", workspaceId, actionId, afterDays }, async () => {
          const updated = appReducer(state, { type: "action/setReminder", workspaceId, actionId, afterDays })
            .actionsByWorkspace[workspaceId]?.find((a) => a.id === actionId);
          if (!updated) return;
          const { error } = await client
            .from("projets_actions")
            .update({ waiting_reminder: updated.waitingReminder })
            .eq("id", actionId);
          if (error) throw error;
        });
      },

      disableReminder: (workspaceId, actionId) => {
        dispatchAndPersist({ type: "action/disableReminder", workspaceId, actionId }, async () => {
          const updated = appReducer(state, { type: "action/disableReminder", workspaceId, actionId })
            .actionsByWorkspace[workspaceId]?.find((a) => a.id === actionId);
          if (!updated) return;
          const { error } = await client
            .from("projets_actions")
            .update({ waiting_reminder: updated.waitingReminder })
            .eq("id", actionId);
          if (error) throw error;
        });
      },

      refreshReminders: (workspaceId) => {
        const now = new Date().toISOString();
        const before = state.actionsByWorkspace[workspaceId] ?? [];
        dispatchAndPersist({ type: "action/refreshReminders", workspaceId, now }, async () => {
          const after = appReducer(state, { type: "action/refreshReminders", workspaceId, now }).actionsByWorkspace[
            workspaceId
          ] ?? [];
          const changed = after.filter((action, index) => action.waitingReminder !== before[index]?.waitingReminder);
          for (const action of changed) {
            const { error } = await client
              .from("projets_actions")
              .update({ waiting_reminder: action.waitingReminder })
              .eq("id", action.id);
            if (error) throw error;
          }
        });
      },

      editAction: (workspaceId, actionId, edit) => {
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "action/edit", workspaceId, actionId, edit, now }, async () => {
          const updated = appReducer(state, { type: "action/edit", workspaceId, actionId, edit, now })
            .actionsByWorkspace[workspaceId]?.find((a) => a.id === actionId);
          if (!updated) return;
          const { error } = await client.from("projets_actions").update(actionToRow(updated, userHash)).eq("id", actionId);
          if (error) throw error;
        });
      },

      addNote: (workspaceId, actionId, text) => {
        const noteId = generateId();
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "action/addNote", workspaceId, actionId, noteId, text, now }, async () => {
          const updated = appReducer(state, { type: "action/addNote", workspaceId, actionId, noteId, text, now })
            .actionsByWorkspace[workspaceId]?.find((a) => a.id === actionId);
          if (!updated) return;
          const { error } = await client.from("projets_actions").update({ notes: updated.notes }).eq("id", actionId);
          if (error) throw error;
        });
      },

      linkAction: (workspaceId, actionId, linkedActionId) => {
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "action/link", workspaceId, actionId, linkedActionId, now }, async () => {
          const { error } = await client
            .from("projets_actions")
            .update({ linked_action_id: linkedActionId, updated_at: now })
            .eq("id", actionId);
          if (error) throw error;
        });
      },

      unlinkAction: (workspaceId, actionId) => {
        const now = new Date().toISOString();
        dispatchAndPersist({ type: "action/unlink", workspaceId, actionId, now }, async () => {
          const { error } = await client
            .from("projets_actions")
            .update({ linked_action_id: null, updated_at: now })
            .eq("id", actionId);
          if (error) throw error;
        });
      },

      deleteAction: (workspaceId, actionId) => {
        const list = state.actionsByWorkspace[workspaceId] ?? [];
        const index = list.findIndex((a) => a.id === actionId);
        const action = index === -1 ? undefined : list[index];
        if (!action) return undefined;
        dispatchAndPersist({ type: "action/delete", workspaceId, actionId }, async () => {
          const { error } = await client.from("projets_actions").delete().eq("id", actionId);
          if (error) throw error;
        });
        return { action, index };
      },

      undoDeleteAction: (workspaceId, action, index) => {
        dispatchAndPersist({ type: "action/undoDelete", workspaceId, action, index }, async () => {
          const { error } = await client.from("projets_actions").insert(actionToRow(action, userHash));
          if (error) throw error;
        });
      },
    }),
    [state, client, userHash, dispatchAndPersist]
  );

  if (status === "loading") {
    return <SupabaseBootScreen label="Chargement des espaces…" />;
  }

  if (status === "error") {
    return <SupabaseBootScreen label={syncError ?? "Erreur de chargement"} isError onRetry={load} />;
  }

  return (
    <StoreContext.Provider value={value}>
      {syncError && <SupabaseSyncErrorBanner message={syncError} onDismiss={() => setSyncError(null)} />}
      {children}
    </StoreContext.Provider>
  );
}

function SupabaseBootScreen({
  label,
  isError,
  onRetry,
}: {
  label: string;
  isError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block" role={isError ? "alert" : "status"} data-variant={isError ? "error" : undefined}>
      <p>{label}</p>
      {onRetry && (
        <button type="button" className="btn tap-target" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

function SupabaseSyncErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="offline-banner" role="alert">
      {message}{" "}
      <button type="button" className="btn tap-target" style={{ marginLeft: 8 }} onClick={onDismiss}>
        Fermer
      </button>
    </div>
  );
}
