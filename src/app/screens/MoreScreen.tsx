import { IconChevronRight } from "../components/Icons";
import { MORE_LINKS, type MoreDestination } from "../more-links";

export function MoreScreen({ onSelect }: { onSelect: (destination: MoreDestination) => void }) {
  return (
    <div>
      <div className="top-bar">
        <h1>Plus</h1>
      </div>
      <div className="app-main">
        <ul className="list action-card-list">
          {MORE_LINKS.map(({ key, label, Icon }) => (
            <li key={key}>
              <button
                type="button"
                className="action-card"
                style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }}
                onClick={() => onSelect(key)}
              >
                <div className="action-card-body" style={{ alignItems: "center" }}>
                  <span className="more-icon" data-key={key} aria-hidden="true">
                    <Icon width={20} height={20} />
                  </span>
                  <span className="card-title" style={{ flex: 1 }}>
                    {label}
                  </span>
                  <IconChevronRight className="chevron" width={18} height={18} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
