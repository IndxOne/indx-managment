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

/**
 * Ne porte plus `userHash` (retiré) : ce fichier peut être partagé/stocké
 * hors de l'appareil (cloud perso, pièce jointe) sans exposer le secret qui
 * conditionne aujourd'hui l'accès aux données (cf. audit RLS). L'export
 * reste write-only — rien dans le code ne relit ce champ pour restaurer.
 */
export interface ExportPayload {
  formatVersion: number;
  exportedAt: string;
  workspaces: AppState["workspaces"];
  actionsByWorkspace: AppState["actionsByWorkspace"];
  recurrenceRulesByWorkspace: AppState["recurrenceRulesByWorkspace"];
  carnetNotes: AppState["carnetNotes"];
  /** Absent des exports générés avant le Lot 8A. */
  membersByWorkspace: NonNullable<AppState["membersByWorkspace"]>;
}

export function buildExportPayload(state: AppState, now: Date = new Date()): ExportPayload {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
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
