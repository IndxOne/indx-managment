/**
 * Personnalisation de la 2e destination de la barre basse mobile (cadrage
 * Lot 3 §3) : remplace "Semaine" par "Rappels" quand l'utilisateur les
 * consulte plus souvent que la vue hebdomadaire. Persisté comme le thème
 * (localStorage, repli mémoire si indisponible) ; un événement custom
 * prévient les composants déjà montés (App.tsx) du changement, puisque le
 * réglage vit dans un écran séparé (AppSettingsScreen).
 */

export type SecondTabPreference = "week" | "reminders";

const STORAGE_KEY = "indxone-second-tab-preference";
const CHANGE_EVENT = "indxone-second-tab-preference-change";

let inMemoryFallback: SecondTabPreference = "week";

export function getStoredSecondTabPreference(): SecondTabPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "reminders" ? "reminders" : "week";
  } catch {
    return inMemoryFallback;
  }
}

export function setSecondTabPreference(preference: SecondTabPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    inMemoryFallback = preference;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onSecondTabPreferenceChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
