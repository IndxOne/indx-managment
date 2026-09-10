import type { Action } from "../../domain/types";
import { scheduleSummary } from "./schedule-summary";

/** Partage natif (Web Share API) : intégration OS, pas juste un lien copié — utile hors ligne comme mitigation guideline 4.2 Apple (cf. docs/stores.md). */

export function isShareSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function shareText(action: Action): string {
  return `${action.title} — ${scheduleSummary(action.schedule)}`;
}

/** Résout silencieusement si l'utilisateur annule le partage (AbortError) : ce n'est pas une erreur. */
export async function shareAction(action: Action): Promise<void> {
  const text = shareText(action);
  if (isShareSupported()) {
    try {
      await navigator.share({ title: action.title, text });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      throw cause;
    }
    return;
  }
  await navigator.clipboard.writeText(text);
}
