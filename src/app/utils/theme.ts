export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "indxone-theme-preference";

/** Repli quand localStorage est indisponible (navigation privée...) : sans
 * lui, getStoredThemePreference() répondrait "system" après un remount
 * alors que le DOM reste explicitement thématisé (finding Codex PR #29). */
let inMemoryFallback: ThemePreference | null = null;

/** "system" : aucun data-theme, la cascade CSS suit prefers-color-scheme. */
export function getStoredThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return inMemoryFallback ?? "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  if (preference === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    inMemoryFallback = preference;
  }
  applyThemePreference(preference);
}
