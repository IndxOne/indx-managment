import { IconBell, IconChevronRight, IconLayers, IconNotebook, IconSettings } from "../components/Icons";

export type MoreDestination = "reminders" | "carnet" | "hub" | "app-settings";

const LINKS: { key: MoreDestination; label: string; Icon: typeof IconBell }[] = [
  { key: "reminders", label: "Rappels", Icon: IconBell },
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "app-settings", label: "Réglages", Icon: IconSettings },
];

export function MoreScreen({ onSelect }: { onSelect: (destination: MoreDestination) => void }) {
  return (
    <div>
      <div className="top-bar">
        <h1>Plus</h1>
      </div>
      <div className="app-main">
        <ul className="list action-card-list">
          {LINKS.map(({ key, label, Icon }) => (
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
