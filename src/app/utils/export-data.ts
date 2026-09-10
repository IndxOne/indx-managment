import type { AppState } from "../adapters/store-context";

/**
 * Filet de sécurité : ni mode offline ni compte réel (isolation par simple
 * hash, cf. user-hash.ts) — un export JSON est la seule sauvegarde possible
 * si le hash se perd ou Supabase est indisponible.
 */

export interface ExportPayload {
  exportedAt: string;
  userHash: string;
  workspaces: AppState["workspaces"];
  actionsByWorkspace: AppState["actionsByWorkspace"];
  recurrenceRulesByWorkspace: AppState["recurrenceRulesByWorkspace"];
  carnetNotes: AppState["carnetNotes"];
}

export function buildExportPayload(state: AppState, userHash: string, now: Date = new Date()): ExportPayload {
  return {
    exportedAt: now.toISOString(),
    userHash,
    workspaces: state.workspaces,
    actionsByWorkspace: state.actionsByWorkspace,
    recurrenceRulesByWorkspace: state.recurrenceRulesByWorkspace,
    carnetNotes: state.carnetNotes,
  };
}

export function downloadExport(payload: ExportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indxone-projets-${payload.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
