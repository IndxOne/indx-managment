import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefItemCard } from "./BriefItemCard";

/** Ne rend rien si `items` est vide (règle centralisée ici, §2 de la gate :
 * "ne pas afficher de section vide"). */
export function BriefSection({
  title,
  items,
  onOpenItem,
}: {
  title: string;
  items: BriefItem[];
  onOpenItem?: (item: BriefItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="brief-section" aria-label={title}>
      <h2 className="brief-section-title">{title}</h2>
      <ul className="brief-section-list">
        {items.map((item) => (
          <li key={item.id}>
            <BriefItemCard item={item} onOpen={onOpenItem} />
          </li>
        ))}
      </ul>
    </section>
  );
}
