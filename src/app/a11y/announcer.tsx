import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface AnnouncerContextValue {
  announce: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

/**
 * Région aria-live unique pour toute l'app : les changements d'état
 * silencieux visuellement (déplacement d'action, changement d'approche)
 * doivent être annoncés aux lecteurs d'écran (cadrage §8 "annonces après
 * déplacement").
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    // Réinitialiser puis reposer le message force la relecture même si le
    // texte est identique à l'annonce précédente.
    setMessage("");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setMessage(next), 30);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerContextValue {
  const ctx = useContext(AnnouncerContext);
  if (!ctx) {
    throw new Error("useAnnouncer doit être utilisé sous AnnouncerProvider");
  }
  return ctx;
}
