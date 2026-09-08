import { IconCalendar, IconGrid, IconMore, IconSun } from "./Icons";

export type NavTab = "today" | "week" | "spaces" | "more";

const TABS: { id: NavTab; label: string; Icon: typeof IconSun }[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun },
  { id: "week", label: "Semaine", Icon: IconCalendar },
  { id: "spaces", label: "Espaces", Icon: IconGrid },
  { id: "more", label: "Plus", Icon: IconMore },
];

export function BottomNav({ active, onChange }: { active: NavTab; onChange: (tab: NavTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="bottom-nav-item tap-target"
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon width={24} height={24} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
