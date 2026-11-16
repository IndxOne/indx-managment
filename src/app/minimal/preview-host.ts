/** Hôtes autorisés pour l'étiquette de version et la démo fictive : Previews Netlify et local, jamais la production. */
export function isPreviewHost(hostname: string): boolean {
  return /^deploy-preview-\d+--[a-z0-9-]+\.netlify\.app$|^localhost$|^127\.0\.0\.1$/.test(hostname);
}

export function isMinimalDemoRequested(loc: Pick<Location, "hostname" | "search"> = window.location): boolean {
  return isPreviewHost(loc.hostname) && new URLSearchParams(loc.search).get("ux-demo") === "minimal";
}
