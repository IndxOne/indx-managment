import { useEffect, useState } from "react";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Nouvelle version déployée : bandeau discret "Mettre à jour" plutôt qu'une
 * bascule forcée (jamais de perte de saisie en cours). Sans ce bandeau, une
 * PWA installée rarement fermée resterait indéfiniment sur l'ancienne version.
 * Vérification horaire : l'app est gardée ouverte toute la journée.
 */
export function UpdatePrompt() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    let timer: number | undefined;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          if (!cancelled) setApplyUpdate(() => () => void updateSW(true));
        },
        onRegisteredSW(_url, registration) {
          if (!registration || cancelled) return;
          timer = window.setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS);
        },
      });
    });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!applyUpdate) return null;
  return (
    <div className="update-banner" role="status">
      <span>Une nouvelle version est prête.</span>
      <button type="button" className="btn btn-primary btn-small" onClick={applyUpdate}>
        Mettre à jour
      </button>
    </div>
  );
}
