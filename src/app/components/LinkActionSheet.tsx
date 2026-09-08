import { useMemo, useState } from "react";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { KIND_LABELS } from "../labels";
import { BottomSheet } from "./BottomSheet";

const MAX_RESULTS = 30;

export function LinkActionSheet({
  action,
  workspaces,
  actionsByWorkspace,
  onClose,
  onLink,
  onUnlink,
  onNavigate,
}: {
  action: Action;
  workspaces: Workspace[];
  actionsByWorkspace: Record<string, Action[]>;
  onClose: () => void;
  onLink: (linkedActionId: string) => void;
  onUnlink: () => void;
  onNavigate: (workspaceId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const linked = useMemo(() => {
    if (!action.linkedActionId) return undefined;
    for (const workspace of workspaces) {
      const found = (actionsByWorkspace[workspace.id] ?? []).find((candidate) => candidate.id === action.linkedActionId);
      if (found) return { action: found, workspace };
    }
    return null;
  }, [action.linkedActionId, actionsByWorkspace, workspaces]);

  const candidates = useMemo(() => {
    if (action.linkedActionId) return [];
    const needle = query.trim().toLowerCase();
    const results: { action: Action; workspace: Workspace }[] = [];
    for (const workspace of workspaces) {
      for (const candidate of actionsByWorkspace[workspace.id] ?? []) {
        if (candidate.id === action.id) continue;
        if (needle && !candidate.title.toLowerCase().includes(needle)) continue;
        results.push({ action: candidate, workspace });
        if (results.length >= MAX_RESULTS) return results;
      }
    }
    return results;
  }, [action.id, action.linkedActionId, actionsByWorkspace, query, workspaces]);

  return (
    <BottomSheet title={`Lien — ${action.title}`} onClose={onClose}>
      <p style={{ fontWeight: 600 }}>Action liée à « {action.title} »</p>

      {action.linkedActionId ? (
        <div className="notes-list-item" style={{ marginBottom: 16 }}>
          {linked === null && <p className="action-sub">Action liée introuvable (supprimée).</p>}
          {linked && (
            <>
              <p>{linked.action.title}</p>
              <p className="action-sub">
                {KIND_LABELS[linked.workspace.kind]} · {linked.workspace.name}
              </p>
              <button
                type="button"
                className="btn btn-block tap-target"
                style={{ marginTop: 8 }}
                onClick={() => {
                  onNavigate(linked.workspace.id);
                  onClose();
                }}
              >
                Voir l'espace
              </button>
            </>
          )}
          <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onUnlink}>
            Délier
          </button>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="link-search">Rechercher une action</label>
            <input
              id="link-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- sheet ouvert par une action explicite, focus attendu (pattern dialog APG)
              autoFocus
            />
          </div>
          {candidates.length === 0 ? (
            <p className="action-sub">Aucune action trouvée.</p>
          ) : (
            <ul className="notes-list">
              {candidates.map(({ action: candidate, workspace }) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="btn btn-block tap-target"
                    style={{ justifyContent: "flex-start", textAlign: "left" }}
                    onClick={() => onLink(candidate.id)}
                  >
                    {candidate.title} — {KIND_LABELS[workspace.kind]} · {workspace.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button type="button" className="btn btn-block tap-target" style={{ marginTop: 8 }} onClick={onClose}>
        Fermer
      </button>
    </BottomSheet>
  );
}
