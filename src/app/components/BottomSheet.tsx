import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bottom sheet accessible : focus posé à l'ouverture, Échap pour fermer,
 * focus restitué à la fermeture, rôle dialog modal.
 */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // Capturé au premier rendu (avant le commit DOM), donc avant qu'un
  // éventuel autoFocus d'un champ enfant ne déplace le focus : capturer
  // dans useEffect serait trop tard, l'enfant montant avant le parent.
  const [previouslyFocused] = useState<HTMLElement | null>(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const sheet = sheetRef.current;
    sheet?.focus();

    function revealInvalidField(field: Element) {
      if (!(field instanceof HTMLElement)) return;
      field.scrollIntoView?.({ block: "center", behavior: "smooth" });
      field.focus({ preventScroll: true });
    }

    function onInvalid(event: Event) {
      revealInvalidField(event.target as Element);
    }

    // Les validations contrôlées signalent l'erreur avec aria-invalid après
    // le clic. L'observer permet au conteneur de traiter aussi ce cas sans
    // dupliquer la logique de scroll dans chaque formulaire.
    const invalidObserver = new MutationObserver((mutations) => {
      if (!mutations.some(({ target }) => target instanceof HTMLElement && target.getAttribute("aria-invalid") === "true")) {
        return;
      }
      const firstInvalid = sheet?.querySelector('[aria-invalid="true"]');
      if (firstInvalid) revealInvalidField(firstInvalid);
    });
    if (sheet) {
      sheet.addEventListener("invalid", onInvalid, true);
      invalidObserver.observe(sheet, { attributes: true, attributeFilter: ["aria-invalid"], subtree: true });
    }

    function fitToVisualViewport() {
      if (!sheet || window.innerWidth >= 640) {
        sheet?.style.removeProperty("bottom");
        sheet?.style.removeProperty("max-height");
        return;
      }
      const viewport = window.visualViewport;
      if (!viewport) return;
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      sheet.style.bottom = `${keyboardInset + 8}px`;
      sheet.style.maxHeight = `${Math.max(0, viewport.height - 16)}px`;
    }

    fitToVisualViewport();
    window.visualViewport?.addEventListener("resize", fitToVisualViewport);
    window.visualViewport?.addEventListener("scroll", fitToVisualViewport);
    window.addEventListener("resize", fitToVisualViewport);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      sheet?.removeEventListener("invalid", onInvalid, true);
      invalidObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", fitToVisualViewport);
      window.visualViewport?.removeEventListener("scroll", fitToVisualViewport);
      window.removeEventListener("resize", fitToVisualViewport);
      previouslyFocused?.focus();
    };
  }, [onClose, previouslyFocused]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheetRef} tabIndex={-1}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sr-only">{title}</h2>
        {children}
      </div>
    </>
  );
}
