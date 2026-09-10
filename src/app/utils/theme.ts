export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "indxone-theme-preference";

/** "system" : aucun data-theme, la cascade CSS suit prefers-color-scheme. */
export function getStoredThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
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
    // Stockage indisponible (navigation privée...) : le thème choisi
    // s'applique quand même pour la session en cours, juste pas retenu.
  }
  applyThemePreference(preference);
}
