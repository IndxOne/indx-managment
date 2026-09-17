import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAnnouncer } from "../a11y/announcer";

export type ToastVariant = "success" | "error";

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Feedback visible + annoncé (lecteur d'écran) pour une action importante (créée/résolue/réouverte/erreur — cadrage §"Feedback"). Auto-disparaît, jamais bloquant. */
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3000;

/**
 * Toast unique à la fois (le plus récent remplace le précédent) — pas de
 * pile empilée qui pousserait le contenu ou masquerait la barre basse.
 * Réutilise AnnouncerProvider pour l'annonce lecteur d'écran plutôt que de
 * dupliquer une région aria-live : ce composant ne gère que le rendu visuel
 * et l'auto-dismiss.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { announce } = useAnnouncer();

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ id: Date.now(), message, variant });
      announce(message);
      timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    },
    [announce]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="toast" data-variant={toast.variant} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé sous ToastProvider");
  }
  return ctx;
}
