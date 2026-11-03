import { IconChevronRight } from "../components/Icons";
import { MORE_LINKS, type MoreDestination } from "../more-links";

export function MoreScreen({ onSelect }: { onSelect: (destination: MoreDestination) => void }) {
  return (
    <div>
      <div className="top-bar">
        <h1>Plus</h1>
      </div>
      <div className="app-main">
        <ul className="list more-list">
          {MORE_LINKS.map(({ key, label, hint, Icon }) => (
            <li key={key}>
              <button
                type="button"
                className="more-row tap-target"
                aria-label={label}
                aria-describedby={`more-hint-${key}`}
                onClick={() => onSelect(key)}
              >
                <span className="more-icon" aria-hidden="true">
                  <Icon width={20} height={20} />
                </span>
                <span className="more-row-text">
                  <span className="more-row-label">{label}</span>
                  <span className="more-row-hint" id={`more-hint-${key}`}>{hint}</span>
                </span>
                <IconChevronRight className="chevron" width={18} height={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
