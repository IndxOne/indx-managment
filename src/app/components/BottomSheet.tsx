import { useEffect, useRef, type ReactNode } from "react";

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

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheetRef} tabIndex={-1}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sr-only">{title}</h2>
        {children}
      </div>
    </>
  );
}
