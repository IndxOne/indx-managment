import type { AppState } from "../adapters/store-context";

/**
 * Filet de sécurité : ni mode offline ni compte réel (isolation par simple
 * hash, cf. user-hash.ts) — un export JSON est la seule sauvegarde possible
 * si le hash se perd ou Supabase est indisponible.
 */

/**
 * `formatVersion` (Lot 8A) : absent sur tout export généré avant ce lot.
 * Un futur import doit traiter son absence comme "1" (forme historique,
 * sans `membersByWorkspace`) plutôt que d'échouer — jamais de rejet d'un
 * ancien export tant que sa forme reste un sous-ensemble de celle-ci.
 */
export const EXPORT_FORMAT_VERSION = 2;

export interface ExportPayload {
  formatVersion: number;
  exportedAt: string;
  userHash: string;
  workspaces: AppState["workspaces"];
  actionsByWorkspace: AppState["actionsByWorkspace"];
  recurrenceRulesByWorkspace: AppState["recurrenceRulesByWorkspace"];
  carnetNotes: AppState["carnetNotes"];
  /** Absent des exports générés avant le Lot 8A. */
  membersByWorkspace: NonNullable<AppState["membersByWorkspace"]>;
}

export function buildExportPayload(state: AppState, userHash: string, now: Date = new Date()): ExportPayload {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    userHash,
    workspaces: state.workspaces,
    actionsByWorkspace: state.actionsByWorkspace,
    recurrenceRulesByWorkspace: state.recurrenceRulesByWorkspace,
    carnetNotes: state.carnetNotes,
    membersByWorkspace: state.membersByWorkspace ?? {},
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
