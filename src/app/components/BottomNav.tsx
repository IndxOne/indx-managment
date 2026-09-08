export type NavTab = "today" | "week" | "spaces" | "more";

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: "today", label: "Aujourd'hui", icon: "☀" },
  { id: "week", label: "Semaine", icon: "📅" },
  { id: "spaces", label: "Espaces", icon: "▦" },
  { id: "more", label: "Plus", icon: "⋯" },
];

export function BottomNav({ active, onChange }: { active: NavTab; onChange: (tab: NavTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="bottom-nav-item tap-target"
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
