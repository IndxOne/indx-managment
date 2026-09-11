import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../adapters/supabase/client";
import { disablePush, enablePush, isPushEnabled, isPushSupported } from "../push/push-subscription";
import { getOrCreateUserHash, setUserHash } from "../adapters/supabase/user-hash";
import { useStore } from "../adapters/store-context";
import { buildExportPayload, downloadExport } from "../utils/export-data";
import { getStoredThemePreference, setThemePreference, type ThemePreference } from "../utils/theme";
import {
  getStoredSecondTabPreference,
  setSecondTabPreference,
  type SecondTabPreference,
} from "../utils/bottom-nav-preference";
import { EmptyState } from "../components/StateBlocks";
import { MoreSubNav } from "../components/MoreSubNav";
import type { MoreDestination } from "../more-links";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

const SECOND_TAB_OPTIONS: { value: SecondTabPreference; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "reminders", label: "Rappels" },
];

/**
 * Réglages globaux (pas de compte Supabase Auth — cf. supabase-store.tsx) :
 * le seul réglage transversal utile aujourd'hui est le code de
 * synchronisation, seul moyen de retrouver ses données depuis un autre
 * navigateur/appareil (voir user-hash.ts).
 */
export function AppSettingsScreen({ onNavigate }: { onNavigate: (destination: MoreDestination) => void }) {
  const { state } = useStore();
  const configured = isSupabaseConfigured();
  const currentCode = configured ? getOrCreateUserHash() : null;
  const [pastedCode, setPastedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(getStoredThemePreference());
  const [secondTab, setSecondTab] = useState<SecondTabPreference>(getStoredSecondTabPreference());

  function handleThemeChange(next: ThemePreference) {
    setTheme(next);
    setThemePreference(next);
  }

  function handleSecondTabChange(next: SecondTabPreference) {
    setSecondTab(next);
    setSecondTabPreference(next);
  }

  useEffect(() => {
    if (configured) void isPushEnabled().then(setPushEnabled);
  }, [configured]);

  async function handleTogglePush() {
    if (!currentCode) return;
    setPushBusy(true);
    setPushError(null);
    try {
      const client = getSupabaseClient();
      if (pushEnabled) await disablePush(client);
      else await enablePush(client, currentCode);
      setPushEnabled(!pushEnabled);
    } catch (cause) {
      setPushError(cause instanceof Error ? cause.message : "Activation impossible.");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleCopy() {
    if (!currentCode) return;
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleExport() {
    if (!currentCode) return;
    downloadExport(buildExportPayload(state, currentCode));
  }

  function handleUseCode() {
    const trimmed = pastedCode.trim();
    if (!trimmed) {
      setError("Colle un code de synchronisation.");
      return;
    }
    if (trimmed === currentCode) {
      setError("C'est déjà le code utilisé sur cet appareil.");
      return;
    }
    if (!window.confirm("Basculer vers ce code affichera les données associées et masquera celles de l'appareil actuel. Continuer ?")) {
      return;
    }
    setUserHash(trimmed);
    window.location.reload();
  }

  return (
    <div>
      <div className="top-bar">
        <h1>Réglages</h1>
      </div>
      <MoreSubNav active="app-settings" onNavigate={onNavigate} />
      <div className="app-main">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Thème
        </h2>
        <div className="choice-group" role="radiogroup" aria-label="Thème">
          {THEME_OPTIONS.map((option) => (
            <label key={option.value} className="choice-option">
              <input
                type="radio"
                name="theme"
                checked={theme === option.value}
                onChange={() => handleThemeChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>

        <h2 className="section-title">Barre de navigation</h2>
        <p className="action-sub">Choisis ce que la 2e destination affiche sur mobile, à côté d'Aujourd'hui.</p>
        <div className="choice-group" role="radiogroup" aria-label="2e destination de la barre basse">
          {SECOND_TAB_OPTIONS.map((option) => (
            <label key={option.value} className="choice-option">
              <input
                type="radio"
                name="second-tab"
                checked={secondTab === option.value}
                onChange={() => handleSecondTabChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>

        {!configured || !currentCode ? (
          <EmptyState
            title="Persistance locale uniquement"
            description="Aucun compte Supabase configuré sur ce déploiement : les données restent dans ce navigateur, pas de synchronisation entre appareils."
          />
        ) : (
          <>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              Code de synchronisation
            </h2>
            <p className="action-sub">
              Ce code relie cet appareil à tes données. Copie-le et colle-le sur un autre appareil (via "Utiliser un
              code" ci-dessous) pour retrouver les mêmes espaces et actions.
            </p>
            <div className="field">
              <input type="text" readOnly value={currentCode} onFocus={(event) => event.target.select()} />
            </div>
            <button type="button" className="btn btn-primary btn-block tap-target" onClick={handleCopy}>
              {copied ? "Copié !" : "Copier le code"}
            </button>

            <h2 className="section-title">Utiliser un code existant</h2>
            <p className="action-sub">Colle ici le code d'un autre appareil pour retrouver ses données ici.</p>
            <div className="field">
              <label htmlFor="sync-code-input">Code</label>
              <input
                id="sync-code-input"
                type="text"
                value={pastedCode}
                onChange={(event) => {
                  setPastedCode(event.target.value);
                  setError(null);
                }}
                aria-invalid={Boolean(error)}
              />
              {error && (
                <p role="alert" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}
            </div>
            <button type="button" className="btn btn-block tap-target" onClick={handleUseCode}>
              Utiliser ce code
            </button>

            <h2 className="section-title">Sauvegarde</h2>
            <p className="action-sub">
              Aucun mode hors ligne, pas de compte réel : exporte régulièrement un fichier JSON de secours.
            </p>
            <button type="button" className="btn btn-block tap-target" onClick={handleExport}>
              Exporter mes données (JSON)
            </button>

            <h2 className="section-title">Notifications de relance</h2>
            <p className="action-sub">
              Reçois une notification sur cet appareil quand une relance est due, même app fermée. Sur iPhone,
              l'app doit d'abord être ajoutée à l'écran d'accueil.
            </p>
            {isPushSupported() ? (
              <button type="button" className="btn btn-block tap-target" disabled={pushBusy} onClick={handleTogglePush}>
                {pushEnabled ? "Désactiver sur cet appareil" : "Activer sur cet appareil"}
              </button>
            ) : (
              <p className="action-sub">Non pris en charge par ce navigateur.</p>
            )}
            {pushError && (
              <p role="alert" style={{ color: "var(--color-danger)" }}>
                {pushError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
