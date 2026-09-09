import { MORE_LINKS, type MoreDestination } from "../more-links";

/** Navigation directe entre les écrans de l'onglet "Plus", sans repasser par la liste. */
export function MoreSubNav({ active, onNavigate }: { active: MoreDestination; onNavigate: (destination: MoreDestination) => void }) {
  return (
    <div className="more-subnav" role="tablist" aria-label="Sections Plus">
      {MORE_LINKS.map(({ key, label, Icon }) => (
        <button
          key={key}
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
