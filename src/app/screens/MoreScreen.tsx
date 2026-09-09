export type MoreDestination = "reminders" | "carnet" | "hub" | "app-settings";

const LINKS: { key: MoreDestination; label: string }[] = [
  { key: "reminders", label: "Rappels" },
  { key: "carnet", label: "Carnet" },
  { key: "hub", label: "Hub" },
  { key: "app-settings", label: "Réglages" },
];

export function MoreScreen({ onSelect }: { onSelect: (destination: MoreDestination) => void }) {
  return (
    <div>
      <div className="top-bar">
        <h1>Plus</h1>
      </div>
      <div className="app-main">
        <ul className="list action-card-list">
          {LINKS.map(({ key, label }) => (
            <li key={key}>
              <button type="button" className="action-card" style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }} onClick={() => onSelect(key)}>
                <span className="card-title">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
