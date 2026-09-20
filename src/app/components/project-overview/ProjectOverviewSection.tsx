import type { ReactNode } from "react";

/** Ne rend rien si `items` est vide (§16 de la gate : une section vide est
 * masquée) — même patron que BriefSection.tsx. */
export function ProjectOverviewSection<T extends { id: string }>({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="brief-section" aria-label={title}>
      <h2 className="brief-section-title">{title}</h2>
      <ul className="brief-section-list">
        {items.map((item) => (
          <li key={item.id}>{renderItem(item)}</li>
        ))}
      </ul>
    </section>
  );
}
