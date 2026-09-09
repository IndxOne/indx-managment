import { useEffect, useRef } from "react";
import { MORE_LINKS, type MoreDestination } from "../more-links";

/** Navigation directe entre les écrans de l'onglet "Plus", sans repasser par la liste. */
export function MoreSubNav({ active, onNavigate }: { active: MoreDestination; onNavigate: (destination: MoreDestination) => void }) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Chaque écran (Rappels/Carnet/Hub/Réglages) est remonté entièrement lors
    // de la navigation (routeKey dans App.tsx) : le bouton qui avait le focus
    // disparaît avec l'ancien écran. On le restitue ici sur l'onglet actif,
    // et on s'assure qu'il est visible si la barre défile horizontalement.
    activeRef.current?.focus({ preventScroll: true });
    // scrollIntoView est absent de jsdom (environnement de test) : pas de
    // polyfill à ajouter pour un simple appel best-effort.
    activeRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <div className="more-subnav" role="tablist" aria-label="Sections Plus">
      {MORE_LINKS.map(({ key, label, Icon }) => (
        <button
          key={key}
          ref={key === active ? activeRef : undefined}
          type="button"
          role="tab"
          aria-selected={key === active}
          className="more-subnav-item"
          data-active={key === active ? "true" : undefined}
          onClick={() => onNavigate(key)}
        >
          <Icon width={16} height={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
