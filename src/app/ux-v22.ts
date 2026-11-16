/** UX V2.2 : interrupteur de repli (VITE_UX_V22=off restaure les vues historiques) et garde de la démo fictive. */
export function isUxV22Enabled(): boolean {
  return import.meta.env.VITE_UX_V22 !== "off";
}

/** Démo fictive déconnectée : jamais en production (hôtes de Preview/local uniquement) + paramètre explicite. */
export function isUxDemoRequested(loc: Pick<Location, "hostname" | "search"> = window.location): boolean {
  const allowedHost = /^deploy-preview-\d+--[a-z0-9-]+\.netlify\.app$|^localhost$|^127\.0\.0\.1$/.test(loc.hostname);
  return allowedHost && new URLSearchParams(loc.search).get("ux-demo") === "v22";
}
