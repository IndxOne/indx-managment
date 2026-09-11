import { useEffect, useState } from "react";
import {
  getStoredSecondTabPreference,
  onSecondTabPreferenceChange,
  type SecondTabPreference,
} from "../utils/bottom-nav-preference";

/** Reflète en direct le choix fait dans Réglages, sans recharger l'app. */
export function useSecondTabPreference(): SecondTabPreference {
  const [preference, setPreference] = useState(getStoredSecondTabPreference);

  useEffect(() => onSecondTabPreferenceChange(() => setPreference(getStoredSecondTabPreference())), []);

  return preference;
}
