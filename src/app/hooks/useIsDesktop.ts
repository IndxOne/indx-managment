import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

// jsdom (tests) n'implémente pas matchMedia : le hook doit rester silencieux
// et retomber sur "mobile" plutôt que de faire planter le rendu en test.
function matchesDesktop(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;
}

/** Reflète le seuil desktop déjà utilisé en CSS (barre latérale, largeur du contenu). */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(matchesDesktop);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
